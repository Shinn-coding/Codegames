import {
  Prisma,
  PrismaClient,
  ProductStatus,
  Role,
  type Product,
} from "@prisma/client";
import { createHash } from "node:crypto";
import { loadEnvFile } from "node:process";

import {
  catalogSeedProducts,
  catalogSeedSettings,
} from "../src/config/catalog";
import { LocalStorageDriver } from "../src/lib/storage/local";

try {
  loadEnvFile(".env.local");
} catch {
  try {
    // A fresh clone may only have `.env`; Prisma and Next.js both read it.
    loadEnvFile(".env");
  } catch {
    // Environment may already be provided by the Prisma CLI or the host.
  }
}

const prisma = new PrismaClient();

/**
 * Generate a private demo delivery file for every purchasable product so the
 * download flow is testable without a public storage URL. Admin uploads can
 * replace or version these files later.
 */
async function seedDemoProductFile(
  product: Pick<Product, "id" | "slug" | "name" | "version" | "licenseType">,
): Promise<string | null> {
  if ((process.env.STORAGE_DRIVER ?? "local") !== "local") {
    return null;
  }

  const storage = new LocalStorageDriver(
    process.env.LOCAL_STORAGE_DIR ?? "./storage",
  );
  const fileName = `codegems-${product.slug}-${product.version}-demo.txt`;
  const storageKey = `products/${product.slug}/${fileName}`;
  const content = [
    "CodeGems demo delivery",
    "======================",
    "",
    `Product: ${product.name}`,
    `Version: ${product.version}`,
    `License type: ${product.licenseType}`,
    "",
    "This private demo file is delivered through a short-lived download token.",
    "It exercises the access-control, usage-limit, and audit flow.",
    "",
    "An admin upload can replace this demo file. CodeGems never exposes a",
    "public storage URL.",
    "",
  ].join("\n");
  const bytes = new TextEncoder().encode(content);

  await storage.put(storageKey, bytes);

  const checksumSha256 = createHash("sha256").update(bytes).digest("hex");

  await prisma.productFile.updateMany({
    where: {
      productId: product.id,
      version: { not: product.version },
    },
    data: { isCurrent: false },
  });

  await prisma.productFile.upsert({
    where: {
      productId_version: {
        productId: product.id,
        version: product.version,
      },
    },
    update: {
      storageKey,
      fileName,
      mimeType: "text/plain; charset=utf-8",
      sizeBytes: bytes.byteLength,
      checksumSha256,
      isCurrent: true,
      scanStatus: "CLEAN",
      scanReport: {
        status: "CLEAN",
        findings: [],
        metadata: { source: "local-seed" },
      },
      scannedAt: new Date(),
      reviewStatus: "APPROVED",
      reviewedBy: "local-seed",
      reviewedAt: new Date(),
      reviewNote: "Local demo fixture; not a production upload.",
    },
    create: {
      productId: product.id,
      version: product.version,
      storageKey,
      fileName,
      mimeType: "text/plain; charset=utf-8",
      sizeBytes: bytes.byteLength,
      checksumSha256,
      isCurrent: true,
      scanStatus: "CLEAN",
      scanReport: {
        status: "CLEAN",
        findings: [],
        metadata: { source: "local-seed" },
      },
      scannedAt: new Date(),
      reviewStatus: "APPROVED",
      reviewedBy: "local-seed",
      reviewedAt: new Date(),
      reviewNote: "Local demo fixture; not a production upload.",
    },
  });

  return fileName;
}

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@local.test" },
    update: {
      name: "Demo Admin",
      role: Role.ADMIN,
      emailVerified: new Date(),
    },
    create: {
      email: "admin@local.test",
      name: "Demo Admin",
      role: Role.ADMIN,
      emailVerified: new Date(),
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "user@local.test" },
    update: {
      name: "Demo User",
      role: Role.USER,
      emailVerified: new Date(),
    },
    create: {
      email: "user@local.test",
      name: "Demo User",
      role: Role.USER,
      emailVerified: new Date(),
    },
  });

  let seededFileCount = 0;

  for (const product of catalogSeedProducts) {
    const data = {
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      features: product.features,
      stack: product.stack,
      changelog: product.changelog as Prisma.InputJsonValue,
      category: product.category,
      status:
        product.status === "AVAILABLE"
          ? ProductStatus.AVAILABLE
          : ProductStatus.COMING_SOON,
      priceIdr: product.priceIdr,
      earlyBirdPriceIdr: product.earlyBirdPriceIdr,
      earlyBirdEndsAt: product.earlyBirdEndsAt
        ? new Date(product.earlyBirdEndsAt)
        : null,
      licenseType: product.licenseType,
      version: product.version,
      coverGradient: product.coverGradient,
      demoUrl: product.demoUrl,
      featured: product.featured,
      sortOrder: product.sortOrder,
    };

    const seededProduct = await prisma.product.upsert({
      where: { slug: product.slug },
      update: data,
      create: { slug: product.slug, ...data },
    });

    if (product.status === "AVAILABLE") {
      const fileName = await seedDemoProductFile(seededProduct);

      if (fileName) {
        seededFileCount += 1;
      }
    }
  }

  for (const [key, value] of Object.entries(catalogSeedSettings)) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  console.info(
    `Seeded users: ${admin.email} (${admin.role}), ${user.email} (${user.role})`,
  );
  console.info(
    `Seeded ${catalogSeedProducts.length} products, ${seededFileCount} demo product files, and ${Object.keys(catalogSeedSettings).length} settings`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
