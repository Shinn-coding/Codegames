import type { License, Order, Prisma, Product } from "@prisma/client";

import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import {
  generateLicenseKey,
  getLicenseKeyMetadata,
  hashLicenseKey,
  isValidLicenseKeyFormat,
  maskLicenseKey,
  normalizeLicenseKey,
} from "@/lib/license-core";

type IssuableOrder = Pick<Order, "id" | "productId" | "userId"> & {
  product: Pick<Product, "licenseType">;
};

export type LicenseEmailOrder = Pick<Order, "orderNumber" | "email"> & {
  product: Pick<Product, "name" | "version" | "licenseType">;
};

export type ActivationResult = {
  alreadyActive: boolean;
  license: {
    id: string;
    type: string;
    status: License["status"];
    activationCount: number;
    maxActivations: number;
    issuedAt: Date;
  };
};

export class LicenseNotFoundError extends Error {
  constructor() {
    super("License key not found.");
    this.name = "LicenseNotFoundError";
  }
}

export class LicenseInactiveError extends Error {
  constructor() {
    super("License is not active.");
    this.name = "LicenseInactiveError";
  }
}

export class ActivationLimitError extends Error {
  constructor() {
    super("License activation limit reached.");
    this.name = "ActivationLimitError";
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

function toActivationResult(
  license: Pick<
    License,
    "id" | "type" | "status" | "activationCount" | "maxActivations" | "issuedAt"
  >,
  alreadyActive: boolean,
): ActivationResult {
  return {
    alreadyActive,
    license: {
      id: license.id,
      type: license.type,
      status: license.status,
      activationCount: license.activationCount,
      maxActivations: license.maxActivations,
      issuedAt: license.issuedAt,
    },
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

/**
 * Create the single license for an order inside the caller's payment
 * transaction. A unique `orderId` is the final duplicate guard.
 */
export async function issueLicenseInTransaction(
  tx: Prisma.TransactionClient,
  order: IssuableOrder,
): Promise<{ license: License; licenseKey: string }> {
  const licenseKey = generateLicenseKey();
  const metadata = getLicenseKeyMetadata(licenseKey);

  const license = await tx.license.create({
    data: {
      orderId: order.id,
      productId: order.productId,
      userId: order.userId,
      keyHash: hashLicenseKey(licenseKey, env.LICENSE_HMAC_SECRET),
      keyPrefix: metadata.keyPrefix,
      keyLast4: metadata.keyLast4,
      type: order.product.licenseType,
      maxActivations: 1,
    },
  });

  return { license, licenseKey };
}

export async function sendLicenseEmail(input: {
  order: LicenseEmailOrder;
  license: Pick<License, "type">;
  licenseKey: string;
}): Promise<void> {
  const { order, license, licenseKey } = input;
  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const receiptUrl = `${appUrl}/checkout/success?order=${encodeURIComponent(
    order.orderNumber,
  )}`;
  const activationUrl = `${appUrl}/api/licenses/activate`;
  const productName = order.product.name;
  const licenseType = license.type;
  const subject = `Your CodeGems license for ${productName}`;
  const activationBody = JSON.stringify({
    licenseKey,
    instanceId: "<your-machine-id>",
  });

  const text = [
    "Thanks for your purchase.",
    "",
    `${productName} (v${order.product.version}) is licensed to ${order.email}.`,
    "",
    `License key: ${licenseKey}`,
    `License type: ${licenseType}`,
    `Order: ${order.orderNumber}`,
    "",
    "This is the only time the full key is shown. Keep it somewhere safe.",
    "We store only an HMAC hash of the key, never the key itself.",
    "",
    `Receipt: ${receiptUrl}`,
    "",
    `Activate this license with a POST request to ${activationUrl}:`,
    activationBody,
    "",
    "If you did not make this purchase, reply to this email.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f7f4ec;color:#1c2a24;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:580px;margin:0 auto;padding:32px 20px;">
      <div style="border-radius:24px;background:#243b33;padding:30px;color:#f7f4ec;">
        <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#bfe0c8;">CodeGems</p>
        <h1 style="margin:18px 0 0;font-size:32px;line-height:1.05;letter-spacing:-0.04em;">Your license is ready.</h1>
        <p style="margin:16px 0 0;font-size:14px;line-height:1.7;color:#d6ded9;">
          ${escapeHtml(productName)} (v${escapeHtml(order.product.version)}) is licensed to
          ${escapeHtml(order.email)}.
        </p>
        <div style="margin-top:24px;border-radius:16px;background:#f7f4ec;padding:18px 20px;color:#243b33;">
          <p style="margin:0 0 8px;font-size:9px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#65736c;">License key</p>
          <p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:18px;font-weight:600;letter-spacing:0.06em;">${escapeHtml(licenseKey)}</p>
        </div>
      </div>

      <div style="margin-top:18px;border:1px solid #ddd8ca;border-radius:20px;background:#fffdf8;padding:24px;">
        <p style="margin:0;font-size:13px;line-height:1.7;">
          This is the only time the full key is shown. Keep it somewhere safe. We store
          only an HMAC hash of the key, never the key itself.
        </p>
        <table role="presentation" style="width:100%;margin-top:18px;border-collapse:collapse;font-size:12px;">
          <tr>
            <td style="padding:6px 0;color:#65736c;">License type</td>
            <td style="padding:6px 0;text-align:right;font-weight:600;">${escapeHtml(licenseType)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#65736c;">Order</td>
            <td style="padding:6px 0;text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(order.orderNumber)}</td>
          </tr>
        </table>
        <a href="${escapeHtml(receiptUrl)}" style="display:inline-block;margin-top:20px;border-radius:999px;background:#243b33;padding:12px 18px;color:#f7f4ec;font-size:12px;font-weight:700;text-decoration:none;">Open receipt</a>
      </div>

      <div style="margin-top:18px;border:1px solid #ddd8ca;border-radius:20px;background:#f7f4ec;padding:24px;">
        <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#65736c;">Activate</p>
        <p style="margin:10px 0 0;font-size:12px;line-height:1.7;color:#65736c;">POST this JSON to <a href="${escapeHtml(activationUrl)}" style="color:#243b33;">${escapeHtml(activationUrl)}</a>:</p>
        <pre style="margin:12px 0 0;overflow-x:auto;border-radius:12px;background:#243b33;padding:14px;color:#f7f4ec;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;line-height:1.6;">${escapeHtml(activationBody)}</pre>
      </div>

      <p style="margin:18px 0 0;text-align:center;font-size:10px;line-height:1.6;color:#8a948e;">If you did not make this purchase, reply to this email.</p>
    </div>
  </body>
</html>`;

  await sendEmail({
    to: order.email,
    subject,
    text,
    html,
  });
}

/**
 * Staff-triggered access email. The raw license key cannot be recovered from
 * the database, so this email carries a fresh short-lived download link and
 * the masked key instead. The key itself stays with the customer.
 */
export async function sendLicenseAccessEmail(input: {
  order: {
    orderNumber: string;
    email: string;
    product: { name: string; version: string };
  };
  license: Pick<License, "keyPrefix" | "keyLast4" | "type">;
  downloadUrl: string;
  expiresAt: Date;
}): Promise<void> {
  const { order, license, downloadUrl, expiresAt } = input;
  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const receiptUrl = `${appUrl}/checkout/success?order=${encodeURIComponent(
    order.orderNumber,
  )}`;
  const absoluteDownloadUrl = `${appUrl}${downloadUrl}`;
  const maskedKey = maskLicenseKey(license);
  const expiresLabel = expiresAt.toUTCString();
  const subject = `Your CodeGems download link for ${order.product.name}`;

  const text = [
    "Here is a fresh download link for your CodeGems purchase.",
    "",
    `${order.product.name} (v${order.product.version})`,
    `Order: ${order.orderNumber}`,
    `License: ${maskedKey} (${license.type})`,
    "",
    `Download: ${absoluteDownloadUrl}`,
    `This link expires on ${expiresLabel} and allows two downloads.`,
    "",
    `Receipt: ${receiptUrl}`,
    "",
    "The full license key was shown once at purchase and is not stored in a",
    "recoverable form. If you lost it, reply to this email.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f4f2ec;color:#16241f;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <div style="border-radius:24px;background:#243b33;padding:30px;color:#f4f2ec;">
        <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#bfe0c8;">CodeGems</p>
        <h1 style="margin:18px 0 0;font-size:30px;line-height:1.05;letter-spacing:-0.04em;">Your download link is ready.</h1>
        <p style="margin:16px 0 0;font-size:14px;line-height:1.7;color:#d6ded9;">
          ${escapeHtml(order.product.name)} (v${escapeHtml(order.product.version)})
        </p>
      </div>

      <div style="margin-top:18px;border:1px solid #ddd8ca;border-radius:20px;background:#fffdf8;padding:24px;">
        <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5d6b64;">Order ${escapeHtml(order.orderNumber)}</p>
        <p style="margin:10px 0 0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:16px;font-weight:600;">${escapeHtml(maskedKey)}</p>
        <a href="${escapeHtml(absoluteDownloadUrl)}" style="display:inline-block;margin-top:18px;border-radius:999px;background:#243b33;padding:12px 20px;color:#f4f2ec;font-size:12px;font-weight:700;text-decoration:none;">Download files</a>
        <p style="margin:14px 0 0;font-size:11px;line-height:1.7;color:#5d6b64;">
          Expires ${escapeHtml(expiresLabel)} · two downloads maximum.
        </p>
      </div>

      <p style="margin:18px 0 0;font-size:11px;line-height:1.7;color:#5d6b64;">
        The full license key was shown once at purchase and is not stored in a recoverable
        form. If you lost it, reply to this email.
      </p>
    </div>
  </body>
</html>`;

  await sendEmail({
    to: order.email,
    subject,
    text,
    html,
  });
}

/**
 * Public activation endpoint core. Only a key hash is looked up, and the
 * conditional counter update makes concurrent activations respect the limit.
 */
export async function activateLicense(input: {
  licenseKey: string;
  instanceId: string;
  ipHash?: string;
  userAgentHash?: string;
}): Promise<ActivationResult> {
  const normalizedKey = normalizeLicenseKey(input.licenseKey);

  if (!isValidLicenseKeyFormat(normalizedKey)) {
    throw new LicenseNotFoundError();
  }

  const license = await prisma.license.findUnique({
    where: {
      keyHash: hashLicenseKey(normalizedKey, env.LICENSE_HMAC_SECRET),
    },
  });

  if (!license) {
    throw new LicenseNotFoundError();
  }

  const now = new Date();

  if (
    license.status !== "ACTIVE" ||
    (license.expiresAt && license.expiresAt.getTime() <= now.getTime())
  ) {
    if (
      license.status === "ACTIVE" &&
      license.expiresAt &&
      license.expiresAt.getTime() <= now.getTime()
    ) {
      await prisma.license.updateMany({
        where: { id: license.id, status: "ACTIVE" },
        data: { status: "EXPIRED" },
      });
    }

    throw new LicenseInactiveError();
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.activation.findUnique({
        where: {
          licenseId_instanceId: {
            licenseId: license.id,
            instanceId: input.instanceId,
          },
        },
      });

      if (existing) {
        await tx.activation.update({
          where: { id: existing.id },
          data: {
            lastSeenAt: now,
            ...(input.ipHash ? { ipHash: input.ipHash } : {}),
            ...(input.userAgentHash
              ? { userAgentHash: input.userAgentHash }
              : {}),
          },
        });

        const fresh = await tx.license.findUniqueOrThrow({
          where: { id: license.id },
        });

        return { license: fresh, alreadyActive: true };
      }

      const incremented = await tx.license.updateMany({
        where: {
          id: license.id,
          status: "ACTIVE",
          activationCount: { lt: license.maxActivations },
        },
        data: { activationCount: { increment: 1 } },
      });

      if (incremented.count === 0) {
        const current = await tx.license.findUniqueOrThrow({
          where: { id: license.id },
          select: {
            status: true,
            activationCount: true,
            maxActivations: true,
            expiresAt: true,
          },
        });

        if (
          current.status !== "ACTIVE" ||
          (current.expiresAt &&
            current.expiresAt.getTime() <= new Date().getTime())
        ) {
          throw new LicenseInactiveError();
        }

        // A concurrent first-time activation for this same instance may have
        // consumed the only slot after our initial lookup. If its Activation
        // row now exists, this request is an idempotent repeat, not a limit
        // violation.
        const concurrent = await tx.activation.findUnique({
          where: {
            licenseId_instanceId: {
              licenseId: license.id,
              instanceId: input.instanceId,
            },
          },
        });

        if (concurrent) {
          await tx.activation.update({
            where: { id: concurrent.id },
            data: {
              lastSeenAt: now,
              ...(input.ipHash ? { ipHash: input.ipHash } : {}),
              ...(input.userAgentHash
                ? { userAgentHash: input.userAgentHash }
                : {}),
            },
          });

          const fresh = await tx.license.findUniqueOrThrow({
            where: { id: license.id },
          });

          return { license: fresh, alreadyActive: true };
        }

        throw new ActivationLimitError();
      }

      await tx.activation.create({
        data: {
          licenseId: license.id,
          instanceId: input.instanceId,
          ipHash: input.ipHash,
          userAgentHash: input.userAgentHash,
        },
      });

      const fresh = await tx.license.findUniqueOrThrow({
        where: { id: license.id },
      });

      return { license: fresh, alreadyActive: false };
    });

    return toActivationResult(result.license, result.alreadyActive);
  } catch (error) {
    // Two concurrent first-time activations for the same instance can race to
    // create the unique Activation row. The losing transaction rolls back its
    // counter increment; treat it as a normal idempotent repeat.
    if (isUniqueConstraintError(error)) {
      const existing = await prisma.activation.findUnique({
        where: {
          licenseId_instanceId: {
            licenseId: license.id,
            instanceId: input.instanceId,
          },
        },
      });

      if (existing) {
        await prisma.activation.update({
          where: { id: existing.id },
          data: {
            lastSeenAt: now,
            ...(input.ipHash ? { ipHash: input.ipHash } : {}),
            ...(input.userAgentHash
              ? { userAgentHash: input.userAgentHash }
              : {}),
          },
        });

        const fresh = await prisma.license.findUniqueOrThrow({
          where: { id: license.id },
        });

        return toActivationResult(fresh, true);
      }
    }

    throw error;
  }
}
