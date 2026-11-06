import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import test, { after } from "node:test";

if (process.env.NODE_ENV === "production") {
  throw new Error("Integration tests refuse to run with NODE_ENV=production.");
}

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) {
    process.loadEnvFile(file);
    break;
  }
}

const { prisma } = await import("../../src/lib/db.ts");
const { OrderAmountMismatchError, hashPayload, recordPaymentEvent } =
  await import("../../src/lib/orders.ts");
const {
  DownloadFileNotFoundError,
  DownloadLicenseNotFoundError,
  DownloadTokenExhaustedError,
  DownloadTokenExpiredError,
  DownloadUnavailableError,
  consumeDownloadToken,
  createDownloadLink,
  createDownloadLinkForLicense,
} = await import("../../src/lib/downloads.ts");
const {
  DOWNLOAD_TOKEN_MAX_USES,
  DOWNLOAD_TOKEN_TTL_MS,
  generateDownloadToken,
  hashDownloadToken,
  isValidDownloadTokenFormat,
} = await import("../../src/lib/download-core.ts");
const { hashLicenseKey, isValidLicenseKeyFormat } =
  await import("../../src/lib/license-core.ts");
const { env } = await import("../../src/lib/env.ts");
const { getStorage } = await import("../../src/lib/storage/index.ts");
const { approveProductFile, reanalyzeProductFile } =
  await import("../../src/lib/admin-products.ts");
const { checkRateLimit } = await import("../../src/lib/rate-limit.ts");

const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
const email = `integration-${suffix}@local.test`;
const slug = `integration-${suffix}`;
const orderNumber = `IT-${suffix}`;
const amountIdr = 25_000;
const fileBytes = new TextEncoder().encode(
  `CodeGems integration fixture ${suffix}\n`,
);
const storageKey = `products/${slug}/fixture-${suffix}.txt`;

let userId = "";
let productId = "";
let orderId = "";
let licenseId = "";
let fileId = "";
let firstPaidAt: Date | null = null;
let licenseKey = "";

after(async () => {
  if (licenseId) {
    await prisma.license.deleteMany({ where: { id: licenseId } });
  }

  if (orderId) {
    await prisma.order.deleteMany({ where: { id: orderId } });
  }

  if (fileId) {
    await prisma.productFile.deleteMany({ where: { id: fileId } });
  }

  await prisma.webhookEvent.deleteMany({ where: { orderNumber } });
  await prisma.rateLimit.deleteMany({
    where: { key: { startsWith: `integration-rate:${suffix}` } },
  });
  await prisma.product.deleteMany({ where: { id: productId } });
  await prisma.user.deleteMany({ where: { id: userId } });

  await getStorage()
    .delete(storageKey)
    .catch(() => undefined);
  await rm(path.join(env.LOCAL_STORAGE_DIR, path.dirname(storageKey)), {
    recursive: true,
    force: true,
  }).catch(() => undefined);

  await prisma.$disconnect();
});

test("payment, license, download, and refund lifecycle", async (t) => {
  await t.test("creates a PENDING order fixture", async () => {
    const user = await prisma.user.create({
      data: { email, name: "Integration Fixture" },
    });
    userId = user.id;

    const product = await prisma.product.create({
      data: {
        slug,
        name: "Integration Fixture Kit",
        tagline: "Temporary integration fixture.",
        description: "Created by the integration test suite and removed after.",
        category: "integration",
        status: "AVAILABLE",
        priceIdr: amountIdr,
        version: "1.0.0",
      },
    });
    productId = product.id;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        email,
        productId,
        amountIdr,
        provider: "mock",
        idempotencyKey: `integration-${suffix}`,
        expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
      },
    });
    orderId = order.id;

    assert.equal(order.status, "PENDING");
  });

  await t.test("enforces a fixed-window rate limit", async () => {
    const key = `integration-rate:${suffix}`;
    const options = { key, limit: 2, windowMs: 60_000 };

    const first = await checkRateLimit(options);
    const second = await checkRateLimit(options);
    const third = await checkRateLimit(options);

    assert.equal(first.allowed, true);
    assert.equal(second.allowed, true);
    assert.equal(third.allowed, false);
    assert.equal(third.remaining, 0);
    assert.ok(third.resetAt.getTime() > Date.now());
  });

  await t.test("settles PAID and creates exactly one license", async () => {
    const eventId = `integration:${suffix}:paid`;
    const result = await recordPaymentEvent({
      provider: "mock",
      eventId,
      orderNumber,
      status: "PAID",
      amountIdr,
      payloadHash: hashPayload(eventId),
    });

    assert.equal(result.duplicate, false);
    assert.equal(result.order.status, "PAID");
    assert.ok(result.order.paidAt);
    firstPaidAt = result.order.paidAt;

    const license = await prisma.license.findUnique({
      where: { orderId },
    });
    assert.ok(license);
    licenseId = license.id;

    assert.equal(license.status, "ACTIVE");
    assert.ok(isValidLicenseKeyFormat(result.licenseKey ?? ""));
    assert.equal(
      license.keyHash,
      hashLicenseKey(result.licenseKey ?? "", env.LICENSE_HMAC_SECRET),
    );
    licenseKey = result.licenseKey ?? "";

    assert.equal(await prisma.license.count({ where: { orderId } }), 1);
    assert.equal(await prisma.webhookEvent.count({ where: { eventId } }), 1);
  });

  await t.test("treats a duplicate webhook as a no-op", async () => {
    const eventId = `integration:${suffix}:paid`;
    const result = await recordPaymentEvent({
      provider: "mock",
      eventId,
      orderNumber,
      status: "PAID",
      amountIdr,
      payloadHash: hashPayload(eventId),
    });

    assert.equal(result.duplicate, true);
    assert.equal(result.order.status, "PAID");
    assert.equal(result.order.license?.id, licenseId);
    assert.equal(result.order.paidAt?.getTime(), firstPaidAt?.getTime());
    assert.equal(await prisma.license.count({ where: { orderId } }), 1);
  });

  await t.test(
    "rejects an amount mismatch without writing an event",
    async () => {
      const eventId = `integration:${suffix}:mismatch`;

      await assert.rejects(
        recordPaymentEvent({
          provider: "mock",
          eventId,
          orderNumber,
          status: "PAID",
          amountIdr: amountIdr + 1,
          payloadHash: hashPayload(eventId),
        }),
        OrderAmountMismatchError,
      );

      assert.equal(await prisma.webhookEvent.count({ where: { eventId } }), 0);
      assert.equal(await prisma.license.count({ where: { orderId } }), 1);
    },
  );

  await t.test("does not issue a download for an unapproved file", async () => {
    const pending = await prisma.productFile.create({
      data: {
        productId,
        version: "0.9.0",
        storageKey,
        fileName: "pending-fixture.txt",
        mimeType: "text/plain",
        sizeBytes: fileBytes.byteLength,
        checksumSha256: "pending-fixture",
        isCurrent: true,
        scanStatus: "SUSPICIOUS",
        reviewStatus: "PENDING",
      },
    });

    try {
      await assert.rejects(
        createDownloadLink({ licenseId, userId }),
        DownloadFileNotFoundError,
      );
    } finally {
      await prisma.productFile.delete({ where: { id: pending.id } });
    }
  });

  await t.test("rescans and approves a pending file", async () => {
    await getStorage().put(storageKey, fileBytes);

    const pending = await prisma.productFile.create({
      data: {
        productId,
        version: "0.9.1",
        storageKey,
        fileName: "rescan-fixture.txt",
        mimeType: "text/plain",
        sizeBytes: fileBytes.byteLength,
        checksumSha256: "rescan-fixture",
        isCurrent: true,
        scanStatus: "PENDING",
        reviewStatus: "PENDING",
      },
    });

    try {
      await reanalyzeProductFile({
        productId,
        fileId: pending.id,
        actorId: userId,
      });

      const scanned = await prisma.productFile.findUnique({
        where: { id: pending.id },
      });
      assert.equal(scanned?.scanStatus, "CLEAN");
      assert.equal(scanned?.reviewStatus, "PENDING");

      await approveProductFile({
        productId,
        fileId: pending.id,
        actorId: userId,
      });

      const approved = await prisma.productFile.findUnique({
        where: { id: pending.id },
      });
      assert.equal(approved?.reviewStatus, "APPROVED");
      assert.equal(approved?.isCurrent, true);
      assert.equal(approved?.reviewedBy, userId);
    } finally {
      await prisma.productFile.deleteMany({ where: { id: pending.id } });
    }
  });

  await t.test("issues an owner-only download link", async () => {
    await getStorage().put(storageKey, fileBytes);

    const file = await prisma.productFile.create({
      data: {
        productId,
        version: "1.0.0",
        storageKey,
        fileName: "integration-fixture.txt",
        mimeType: "text/plain",
        sizeBytes: fileBytes.byteLength,
        checksumSha256: "integration-fixture",
        isCurrent: true,
        scanStatus: "CLEAN",
        scanReport: {
          status: "CLEAN",
          findings: [],
          metadata: { source: "integration-fixture" },
        },
        scannedAt: new Date(),
        reviewStatus: "APPROVED",
        reviewedBy: "integration-fixture",
        reviewedAt: new Date(),
      },
    });
    fileId = file.id;

    await assert.rejects(
      createDownloadLink({ licenseId, userId: "not-the-owner" }),
      DownloadLicenseNotFoundError,
    );

    const link = await createDownloadLink({ licenseId, userId });
    const token = link.url.split("/").pop() ?? "";

    assert.ok(isValidDownloadTokenFormat(token));
    assert.equal(link.maxUses, DOWNLOAD_TOKEN_MAX_USES);
    assert.equal(link.sizeBytes, fileBytes.byteLength);

    const ttl = link.expiresAt.getTime() - Date.now();
    assert.ok(ttl > DOWNLOAD_TOKEN_TTL_MS - 5_000);
    assert.ok(ttl <= DOWNLOAD_TOKEN_TTL_MS);

    // Keep the token in the URL only; the raw value is never persisted.
    const stored = await prisma.downloadToken.findFirst({
      where: { licenseId },
      orderBy: { createdAt: "desc" },
    });
    assert.ok(stored);
    assert.equal(stored.tokenHash, hashDownloadToken(token));
    assert.notEqual(stored.tokenHash, token);

    const first = await consumeDownloadToken({ token });
    assert.equal(
      await new Response(first.stream).text(),
      new TextDecoder().decode(fileBytes),
    );
    const second = await consumeDownloadToken({ token });
    assert.equal(second.fileName, "integration-fixture.txt");

    const used = await prisma.downloadToken.findUniqueOrThrow({
      where: { id: stored.id },
    });
    assert.equal(used.usedCount, DOWNLOAD_TOKEN_MAX_USES);
    assert.equal(await prisma.downloadLog.count({ where: { licenseId } }), 2);

    await assert.rejects(
      consumeDownloadToken({ token }),
      DownloadTokenExhaustedError,
    );
  });

  await t.test("rejects an expired token", async () => {
    const token = generateDownloadToken();

    await prisma.downloadToken.create({
      data: {
        licenseId,
        tokenHash: hashDownloadToken(token),
        expiresAt: new Date(Date.now() - 1_000),
        maxUses: DOWNLOAD_TOKEN_MAX_USES,
      },
    });

    await assert.rejects(
      consumeDownloadToken({ token }),
      DownloadTokenExpiredError,
    );
  });

  await t.test(
    "refund revokes the license and expires outstanding tokens",
    async () => {
      const link = await createDownloadLinkForLicense(licenseId);
      const outstandingToken = link.url.split("/").pop() ?? "";
      const eventId = `integration:${suffix}:refund`;

      const result = await recordPaymentEvent({
        provider: "mock",
        eventId,
        orderNumber,
        status: "REFUNDED",
        amountIdr,
        payloadHash: hashPayload(eventId),
      });

      assert.equal(result.order.status, "REFUNDED");

      const license = await prisma.license.findUniqueOrThrow({
        where: { id: licenseId },
      });
      assert.equal(license.status, "REVOKED");
      assert.ok(license.revokedAt);

      const token = await prisma.downloadToken.findFirstOrThrow({
        where: { tokenHash: hashDownloadToken(outstandingToken) },
      });
      assert.ok(token.expiresAt.getTime() <= license.revokedAt.getTime());

      await assert.rejects(
        createDownloadLinkForLicense(licenseId),
        DownloadUnavailableError,
      );
      await assert.rejects(
        consumeDownloadToken({ token: outstandingToken }),
        DownloadUnavailableError,
      );

      // The key is still a valid-format secret, but the license behind it is not.
      assert.ok(isValidLicenseKeyFormat(licenseKey));
    },
  );
});
