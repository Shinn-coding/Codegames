import { createHash, randomUUID } from "node:crypto";

import { Prisma, type Product, type ProductFile } from "@prisma/client";

import type { ProductFormValues, ProductStatusValue } from "@/lib/admin-core";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { buildProductStorageKey } from "@/lib/upload-core";

export type AdminProduct = Prisma.ProductGetPayload<{
  include: {
    files: true;
    _count: { select: { orders: true; licenses: true } };
  };
}>;

export class AdminProductNotFoundError extends Error {
  constructor() {
    super("Product not found.");
    this.name = "AdminProductNotFoundError";
  }
}

export class ProductSlugTakenError extends Error {
  constructor() {
    super("That slug is already used by another product.");
    this.name = "ProductSlugTakenError";
  }
}

export class ProductFileNotFoundError extends Error {
  constructor() {
    super("Product file not found.");
    this.name = "ProductFileNotFoundError";
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

function productData(value: ProductFormValues) {
  return {
    name: value.name,
    slug: value.slug,
    tagline: value.tagline,
    description: value.description,
    features: value.features,
    stack: value.stack,
    changelog: value.changelog as Prisma.InputJsonValue,
    category: value.category,
    status: value.status,
    priceIdr: value.priceIdr,
    earlyBirdPriceIdr: value.earlyBirdPriceIdr,
    earlyBirdEndsAt: value.earlyBirdEndsAt,
    licenseType: value.licenseType,
    version: value.version,
    coverGradient: value.coverGradient,
    demoUrl: value.demoUrl,
    featured: value.featured,
    sortOrder: value.sortOrder,
  };
}

export async function listAdminProducts(): Promise<AdminProduct[]> {
  return prisma.product.findMany({
    include: {
      files: { orderBy: { createdAt: "desc" } },
      _count: { select: { orders: true, licenses: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getAdminProduct(id: string): Promise<AdminProduct | null> {
  return prisma.product.findUnique({
    where: { id },
    include: {
      files: { orderBy: { createdAt: "desc" } },
      _count: { select: { orders: true, licenses: true } },
    },
  });
}

export async function createAdminProduct(input: {
  value: ProductFormValues;
  actorId: string;
  ipHash?: string;
}): Promise<Product> {
  try {
    const product = await prisma.product.create({
      data: productData(input.value),
    });

    await recordAudit({
      actorId: input.actorId,
      action: "product.create",
      entity: "product",
      entityId: product.id,
      meta: { slug: product.slug, status: product.status },
      ipHash: input.ipHash,
    });

    return product;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ProductSlugTakenError();
    }
    throw error;
  }
}

export async function updateAdminProduct(input: {
  id: string;
  value: ProductFormValues;
  actorId: string;
  ipHash?: string;
}): Promise<Product> {
  try {
    const product = await prisma.product.update({
      where: { id: input.id },
      data: productData(input.value),
    });

    await recordAudit({
      actorId: input.actorId,
      action: "product.update",
      entity: "product",
      entityId: product.id,
      meta: {
        slug: product.slug,
        priceIdr: product.priceIdr,
        version: product.version,
      },
      ipHash: input.ipHash,
    });

    return product;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ProductSlugTakenError();
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new AdminProductNotFoundError();
    }

    throw error;
  }
}

export async function setProductStatus(input: {
  id: string;
  status: ProductStatusValue;
  actorId: string;
  ipHash?: string;
}): Promise<void> {
  const updated = await prisma.product.updateMany({
    where: { id: input.id },
    data: { status: input.status },
  });

  if (updated.count === 0) {
    throw new AdminProductNotFoundError();
  }

  await recordAudit({
    actorId: input.actorId,
    action: "product.status",
    entity: "product",
    entityId: input.id,
    meta: { status: input.status },
    ipHash: input.ipHash,
  });
}

/**
 * Store an upload in private storage, then record it as the current delivery
 * file for its version. The previous bytes for the same version are removed
 * only after the database transaction succeeds.
 */
export async function saveProductFile(input: {
  product: Pick<Product, "id" | "slug">;
  version: string;
  fileName: string;
  extension: string;
  mimeType: string;
  bytes: Uint8Array;
  actorId: string;
  ipHash?: string;
}): Promise<ProductFile> {
  const storage = getStorage();
  const storageKey = buildProductStorageKey({
    slug: input.product.slug,
    version: input.version,
    extension: input.extension,
    randomId: randomUUID().replace(/-/g, "").slice(0, 12),
  });
  const checksumSha256 = createHash("sha256")
    .update(input.bytes)
    .digest("hex");

  await storage.put(storageKey, input.bytes, {
    contentType: input.mimeType,
  });

  let previousKey: string | null = null;

  try {
    const file = await prisma.$transaction(async (tx) => {
      const existing = await tx.productFile.findUnique({
        where: {
          productId_version: {
            productId: input.product.id,
            version: input.version,
          },
        },
      });

      if (existing && existing.storageKey !== storageKey) {
        previousKey = existing.storageKey;
      }

      await tx.productFile.updateMany({
        where: { productId: input.product.id, isCurrent: true },
        data: { isCurrent: false },
      });

      if (existing) {
        return tx.productFile.update({
          where: { id: existing.id },
          data: {
            storageKey,
            fileName: input.fileName,
            mimeType: input.mimeType,
            sizeBytes: input.bytes.byteLength,
            checksumSha256,
            isCurrent: true,
          },
        });
      }

      return tx.productFile.create({
        data: {
          productId: input.product.id,
          version: input.version,
          storageKey,
          fileName: input.fileName,
          mimeType: input.mimeType,
          sizeBytes: input.bytes.byteLength,
          checksumSha256,
          isCurrent: true,
        },
      });
    });

    if (previousKey) {
      await storage.delete(previousKey).catch(() => undefined);
    }

    await recordAudit({
      actorId: input.actorId,
      action: "product.file.upload",
      entity: "product",
      entityId: input.product.id,
      meta: {
        version: input.version,
        fileName: input.fileName,
        sizeBytes: input.bytes.byteLength,
      },
      ipHash: input.ipHash,
    });

    return file;
  } catch (error) {
    // The bytes are already on disk. Remove them so a failed transaction does
    // not leave an orphaned object behind.
    await storage.delete(storageKey).catch(() => undefined);
    throw error;
  }
}

export async function setCurrentProductFile(input: {
  productId: string;
  fileId: string;
  actorId: string;
  ipHash?: string;
}): Promise<void> {
  const file = await prisma.productFile.findFirst({
    where: { id: input.fileId, productId: input.productId },
    select: { id: true, version: true },
  });

  if (!file) {
    throw new ProductFileNotFoundError();
  }

  await prisma.$transaction([
    prisma.productFile.updateMany({
      where: { productId: input.productId },
      data: { isCurrent: false },
    }),
    prisma.productFile.update({
      where: { id: file.id },
      data: { isCurrent: true },
    }),
  ]);

  await recordAudit({
    actorId: input.actorId,
    action: "product.file.current",
    entity: "product",
    entityId: input.productId,
    meta: { version: file.version },
    ipHash: input.ipHash,
  });
}

export async function deleteProductFile(input: {
  productId: string;
  fileId: string;
  actorId: string;
  ipHash?: string;
}): Promise<void> {
  const file = await prisma.productFile.findFirst({
    where: { id: input.fileId, productId: input.productId },
  });

  if (!file) {
    throw new ProductFileNotFoundError();
  }

  await prisma.$transaction(async (tx) => {
    await tx.productFile.delete({ where: { id: file.id } });

    if (file.isCurrent) {
      const replacement = await tx.productFile.findFirst({
        where: { productId: input.productId },
        orderBy: { createdAt: "desc" },
      });

      if (replacement) {
        await tx.productFile.update({
          where: { id: replacement.id },
          data: { isCurrent: true },
        });
      }
    }
  });

  await getStorage().delete(file.storageKey).catch(() => undefined);

  await recordAudit({
    actorId: input.actorId,
    action: "product.file.delete",
    entity: "product",
    entityId: input.productId,
    meta: { version: file.version, fileName: file.fileName },
    ipHash: input.ipHash,
  });
}
