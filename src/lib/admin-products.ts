import { createHash, randomUUID } from "node:crypto";

import {
  Prisma,
  type Product,
  type ProductFile,
  type ProductFileScanStatus,
} from "@prisma/client";

import type { ProductFormValues, ProductStatusValue } from "@/lib/admin-core";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { assertSafeStorageKey } from "@/lib/storage/keys";
import {
  MAX_UPLOAD_BYTES,
  buildProductStorageKey,
  detectUpload,
} from "@/lib/upload-core";
import {
  analyzeUpload,
  canApproveScanStatus,
  isBlockedScanStatus,
  type UploadScanReport,
  type UploadScanStatus,
} from "@/lib/upload-security";

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

export class ProductFileApprovalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductFileApprovalError";
  }
}

export class ProductFileNotApprovedError extends Error {
  constructor() {
    super("Only an approved, scanned file can be made current.");
    this.name = "ProductFileNotApprovedError";
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

export async function getAdminProduct(
  id: string,
): Promise<AdminProduct | null> {
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

type PersistedProductFileInput = {
  product: Pick<Product, "id" | "slug">;
  version: string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  scanReport: UploadScanReport;
  actorId: string;
  ipHash?: string;
};

/**
 * Record an already-uploaded private object. Uploads always start outside the
 * published state: even a clean scan needs an explicit admin approval before
 * the file can become current or be served to a customer.
 */
async function persistProductFile(
  input: PersistedProductFileInput,
): Promise<ProductFile> {
  assertSafeStorageKey(input.storageKey);

  let previousKey: string | null = null;
  const scanStatus = input.scanReport.status as ProductFileScanStatus;
  const scannedAt = new Date(input.scanReport.scannedAt);

  const file = await prisma.$transaction(async (tx) => {
    const existing = await tx.productFile.findUnique({
      where: {
        productId_version: {
          productId: input.product.id,
          version: input.version,
        },
      },
    });

    if (existing && existing.storageKey !== input.storageKey) {
      previousKey = existing.storageKey;
    }

    const pendingData = {
      storageKey: input.storageKey,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      checksumSha256: input.checksumSha256,
      isCurrent: false,
      scanStatus,
      scanReport: input.scanReport as unknown as Prisma.InputJsonValue,
      scannedAt,
      reviewStatus: "PENDING" as const,
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
    };

    if (existing) {
      return tx.productFile.update({
        where: { id: existing.id },
        data: pendingData,
      });
    }

    return tx.productFile.create({
      data: {
        productId: input.product.id,
        version: input.version,
        ...pendingData,
      },
    });
  });

  if (previousKey) {
    await getStorage()
      .delete(previousKey)
      .catch(() => undefined);
  }

  await recordAudit({
    actorId: input.actorId,
    action: "product.file.upload",
    entity: "product",
    entityId: input.product.id,
    meta: {
      version: input.version,
      fileName: input.fileName,
      sizeBytes: input.sizeBytes,
      scanStatus: input.scanReport.status,
      scanFindingCount: input.scanReport.findings.length,
    },
    ipHash: input.ipHash,
  });

  return file;
}

/**
 * Server-side upload path used by local storage and small local uploads.
 */
export async function saveProductFile(input: {
  product: Pick<Product, "id" | "slug">;
  version: string;
  fileName: string;
  extension: string;
  mimeType: string;
  bytes: Uint8Array;
  scanReport: UploadScanReport;
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
  const checksumSha256 = createHash("sha256").update(input.bytes).digest("hex");

  await storage.put(storageKey, input.bytes, {
    contentType: input.mimeType,
  });

  try {
    return await persistProductFile({
      product: input.product,
      version: input.version,
      storageKey,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.bytes.byteLength,
      checksumSha256,
      scanReport: input.scanReport,
      actorId: input.actorId,
      ipHash: input.ipHash,
    });
  } catch (error) {
    await storage.delete(storageKey).catch(() => undefined);
    throw error;
  }
}

/**
 * Client-upload path: the browser sends the bytes straight to private Blob
 * storage and the server records the already-uploaded object.
 */
export async function saveProductFileFromStorage(input: {
  product: Pick<Product, "id" | "slug">;
  version: string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  scanReport: UploadScanReport;
  actorId: string;
  ipHash?: string;
}): Promise<ProductFile> {
  try {
    return await persistProductFile(input);
  } catch (error) {
    await getStorage()
      .delete(input.storageKey)
      .catch(() => undefined);
    throw error;
  }
}

/**
 * Re-run analysis for files created before the scan gate existed, or for a
 * scan that failed transiently. This never publishes a file by itself.
 */
export async function reanalyzeProductFile(input: {
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

  if (file.scanStatus !== "PENDING" && file.scanStatus !== "ERROR") {
    throw new ProductFileApprovalError(
      "This file already has a completed scan. Upload a new version to rescan it.",
    );
  }

  if (file.sizeBytes > MAX_UPLOAD_BYTES) {
    throw new ProductFileApprovalError(
      "The stored file is larger than the 50 MB scan limit.",
    );
  }

  let bytes: Uint8Array;

  try {
    bytes = await getStorage().get(file.storageKey);
  } catch (error) {
    console.error(
      "[admin] Could not read the file for rescan.",
      error instanceof Error ? error.message : "unknown error",
    );
    throw new ProductFileApprovalError(
      "The stored file could not be read for scanning.",
    );
  }

  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new ProductFileApprovalError(
      "The stored file is larger than the 50 MB scan limit.",
    );
  }

  const detected = detectUpload(bytes, file.fileName);

  if (!detected) {
    throw new ProductFileApprovalError(
      "The stored file no longer matches its extension or file signature.",
    );
  }

  const scanReport = await analyzeUpload({
    bytes,
    fileName: file.fileName,
    detected,
  });
  const scanStatus = scanReport.status as ProductFileScanStatus;

  await prisma.productFile.update({
    where: { id: file.id },
    data: {
      scanStatus,
      scanReport: scanReport as unknown as Prisma.InputJsonValue,
      scannedAt: new Date(scanReport.scannedAt),
      reviewStatus: "PENDING",
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      isCurrent: isBlockedScanStatus(scanReport.status)
        ? false
        : file.isCurrent,
    },
  });

  await recordAudit({
    actorId: input.actorId,
    action: "product.file.scan",
    entity: "product",
    entityId: input.productId,
    meta: {
      version: file.version,
      fileName: file.fileName,
      scanStatus: scanReport.status,
      scanFindingCount: scanReport.findings.length,
    },
    ipHash: input.ipHash,
  });
}

export async function setCurrentProductFile(input: {
  productId: string;
  fileId: string;
  actorId: string;
  ipHash?: string;
}): Promise<void> {
  const file = await prisma.productFile.findFirst({
    where: { id: input.fileId, productId: input.productId },
    select: {
      id: true,
      version: true,
      scanStatus: true,
      reviewStatus: true,
    },
  });

  if (!file) {
    throw new ProductFileNotFoundError();
  }

  if (
    file.reviewStatus !== "APPROVED" ||
    !canApproveScanStatus(file.scanStatus as UploadScanStatus)
  ) {
    throw new ProductFileNotApprovedError();
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

export async function approveProductFile(input: {
  productId: string;
  fileId: string;
  actorId: string;
  note?: string;
  ipHash?: string;
}): Promise<void> {
  const file = await prisma.productFile.findFirst({
    where: { id: input.fileId, productId: input.productId },
  });

  if (!file) {
    throw new ProductFileNotFoundError();
  }

  const scanStatus = file.scanStatus as UploadScanStatus;

  if (isBlockedScanStatus(scanStatus) || !canApproveScanStatus(scanStatus)) {
    throw new ProductFileApprovalError(
      "This file was blocked or could not be analyzed and cannot be approved.",
    );
  }

  const note = input.note?.trim().slice(0, 500) || null;

  if (scanStatus === "SUSPICIOUS" && !note) {
    throw new ProductFileApprovalError(
      "Add a review note before approving a suspicious file.",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.productFile.updateMany({
      where: { productId: input.productId, isCurrent: true },
      data: { isCurrent: false },
    });

    await tx.productFile.update({
      where: { id: file.id },
      data: {
        reviewStatus: "APPROVED",
        reviewedBy: input.actorId,
        reviewedAt: new Date(),
        reviewNote: note,
        isCurrent: true,
      },
    });
  });

  await recordAudit({
    actorId: input.actorId,
    action: "product.file.approve",
    entity: "product",
    entityId: input.productId,
    meta: {
      version: file.version,
      fileName: file.fileName,
      scanStatus: file.scanStatus,
      note,
    },
    ipHash: input.ipHash,
  });
}

export async function rejectProductFile(input: {
  productId: string;
  fileId: string;
  actorId: string;
  note?: string;
  ipHash?: string;
}): Promise<void> {
  const file = await prisma.productFile.findFirst({
    where: { id: input.fileId, productId: input.productId },
  });

  if (!file) {
    throw new ProductFileNotFoundError();
  }

  const note = input.note?.trim().slice(0, 500) || null;

  await prisma.$transaction(async (tx) => {
    await tx.productFile.update({
      where: { id: file.id },
      data: {
        reviewStatus: "REJECTED",
        reviewedBy: input.actorId,
        reviewedAt: new Date(),
        reviewNote: note,
        isCurrent: false,
      },
    });

    if (file.isCurrent) {
      const replacement = await tx.productFile.findFirst({
        where: {
          productId: input.productId,
          reviewStatus: "APPROVED",
          scanStatus: { in: ["CLEAN", "SUSPICIOUS"] },
        },
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

  await recordAudit({
    actorId: input.actorId,
    action: "product.file.reject",
    entity: "product",
    entityId: input.productId,
    meta: {
      version: file.version,
      fileName: file.fileName,
      scanStatus: file.scanStatus,
      note,
    },
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
        where: {
          productId: input.productId,
          reviewStatus: "APPROVED",
          scanStatus: { in: ["CLEAN", "SUSPICIOUS"] },
        },
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

  await getStorage()
    .delete(file.storageKey)
    .catch(() => undefined);

  await recordAudit({
    actorId: input.actorId,
    action: "product.file.delete",
    entity: "product",
    entityId: input.productId,
    meta: { version: file.version, fileName: file.fileName },
    ipHash: input.ipHash,
  });
}
