import { prisma } from "@/lib/db";
import {
  DOWNLOAD_TOKEN_MAX_USES,
  DOWNLOAD_TOKEN_TTL_MS,
  canDownloadLicense,
  generateDownloadToken,
  getDownloadTokenUseStatus,
  hashDownloadToken,
  isLicenseOwner,
  isValidDownloadTokenFormat,
  sanitizeDownloadFileName,
  type DownloadLicenseStatus,
  type DownloadOrderStatus,
} from "@/lib/download-core";
import { getStorage } from "@/lib/storage";

export type CreatedDownloadLink = {
  url: string;
  fileName: string;
  sizeBytes: number;
  expiresAt: Date;
  maxUses: number;
};

export type DownloadDelivery = {
  stream: ReadableStream<Uint8Array>;
  fileName: string;
  sizeBytes: number;
};

export class DownloadLicenseNotFoundError extends Error {
  constructor() {
    super("License not found.");
    this.name = "DownloadLicenseNotFoundError";
  }
}

export class DownloadUnavailableError extends Error {
  constructor() {
    super("This license is not available for download.");
    this.name = "DownloadUnavailableError";
  }
}

export class DownloadFileNotFoundError extends Error {
  constructor() {
    super("The product file is not available.");
    this.name = "DownloadFileNotFoundError";
  }
}

export class DownloadTokenNotFoundError extends Error {
  constructor() {
    super("Download link not found.");
    this.name = "DownloadTokenNotFoundError";
  }
}

export class DownloadTokenExpiredError extends Error {
  constructor() {
    super("Download link has expired.");
    this.name = "DownloadTokenExpiredError";
  }
}

export class DownloadTokenExhaustedError extends Error {
  constructor() {
    super("Download link has reached its usage limit.");
    this.name = "DownloadTokenExhaustedError";
  }
}

export class DownloadTokenUnavailableError extends Error {
  constructor() {
    super("Download link is no longer available.");
    this.name = "DownloadTokenUnavailableError";
  }
}

type DownloadableLicense = {
  id: string;
  productId: string;
  status: DownloadLicenseStatus;
  expiresAt: Date | null;
  order: { status: DownloadOrderStatus };
};

async function issueDownloadLink(
  license: DownloadableLicense,
): Promise<CreatedDownloadLink> {
  if (
    !canDownloadLicense({
      licenseStatus: license.status,
      orderStatus: license.order.status,
      licenseExpiresAt: license.expiresAt,
    })
  ) {
    throw new DownloadUnavailableError();
  }

  const productFile = await prisma.productFile.findFirst({
    where: {
      productId: license.productId,
      isCurrent: true,
      reviewStatus: "APPROVED",
      scanStatus: { in: ["CLEAN", "SUSPICIOUS"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!productFile) {
    throw new DownloadFileNotFoundError();
  }

  const token = generateDownloadToken();
  const expiresAt = new Date(Date.now() + DOWNLOAD_TOKEN_TTL_MS);

  await prisma.downloadToken.create({
    data: {
      licenseId: license.id,
      tokenHash: hashDownloadToken(token),
      expiresAt,
      maxUses: DOWNLOAD_TOKEN_MAX_USES,
    },
  });

  return {
    url: `/api/download/${token}`,
    fileName: sanitizeDownloadFileName(productFile.fileName),
    sizeBytes: productFile.sizeBytes,
    expiresAt,
    maxUses: DOWNLOAD_TOKEN_MAX_USES,
  };
}

/**
 * Owner-only token issuance. The token is short-lived, capped at two uses,
 * and stored as a SHA-256 digest so a database leak cannot be replayed.
 */
export async function createDownloadLink(input: {
  licenseId: string;
  userId: string;
}): Promise<CreatedDownloadLink> {
  const license = await prisma.license.findUnique({
    where: { id: input.licenseId },
    include: { order: true },
  });

  // Deliberately use the same error for missing and foreign licenses so the
  // endpoint does not disclose whether another customer's license exists.
  if (!license || !isLicenseOwner(license.userId, input.userId)) {
    throw new DownloadLicenseNotFoundError();
  }

  return issueDownloadLink(license);
}

/**
 * Admin-side re-issue used when staff resend an access email. Ownership is not
 * checked here because the caller must already be an authenticated admin; the
 * license status and order status checks still apply.
 */
export async function createDownloadLinkForLicense(
  licenseId: string,
): Promise<CreatedDownloadLink> {
  const license = await prisma.license.findUnique({
    where: { id: licenseId },
    include: { order: true },
  });

  if (!license) {
    throw new DownloadLicenseNotFoundError();
  }

  return issueDownloadLink(license);
}

/**
 * Consume one use of a bearer token and return the current private file.
 *
 * The conditional update makes the use counter safe under concurrency, and the
 * license/order re-check means a refund or expiry immediately blocks a token
 * that was already issued.
 */
export async function consumeDownloadToken(input: {
  token: string;
  ipHash?: string;
  userAgent?: string | null;
}): Promise<DownloadDelivery> {
  if (!isValidDownloadTokenFormat(input.token)) {
    throw new DownloadTokenNotFoundError();
  }

  const tokenHash = hashDownloadToken(input.token);

  const productFile = await prisma.$transaction(async (tx) => {
    const record = await tx.downloadToken.findUnique({
      where: { tokenHash },
      include: {
        license: {
          include: { order: true },
        },
      },
    });

    if (!record) {
      throw new DownloadTokenNotFoundError();
    }

    if (
      !canDownloadLicense({
        licenseStatus: record.license.status,
        orderStatus: record.license.order.status,
        licenseExpiresAt: record.license.expiresAt,
      })
    ) {
      throw new DownloadUnavailableError();
    }

    const useStatus = getDownloadTokenUseStatus({
      expiresAt: record.expiresAt,
      usedCount: record.usedCount,
      maxUses: record.maxUses,
    });

    if (useStatus === "expired") {
      throw new DownloadTokenExpiredError();
    }

    if (useStatus === "exhausted") {
      throw new DownloadTokenExhaustedError();
    }

    const currentFile = await tx.productFile.findFirst({
      where: {
        productId: record.license.productId,
        isCurrent: true,
        reviewStatus: "APPROVED",
        scanStatus: { in: ["CLEAN", "SUSPICIOUS"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!currentFile) {
      throw new DownloadFileNotFoundError();
    }

    const now = new Date();
    const consumed = await tx.downloadToken.updateMany({
      where: {
        id: record.id,
        usedCount: { lt: record.maxUses },
        expiresAt: { gt: now },
      },
      data: { usedCount: { increment: 1 } },
    });

    if (consumed.count === 0) {
      // A concurrent request exhausted the token or its TTL elapsed between
      // the read and the conditional update.
      throw new DownloadTokenUnavailableError();
    }

    await tx.downloadLog.create({
      data: {
        licenseId: record.licenseId,
        tokenId: record.id,
        ipHash: input.ipHash,
        userAgent: input.userAgent?.slice(0, 512),
      },
    });

    return currentFile;
  });

  let stream: ReadableStream<Uint8Array>;

  try {
    stream = await getStorage().getStream(productFile.storageKey);
  } catch (error) {
    console.error(
      "[download] Could not open the product file from storage.",
      error instanceof Error ? error.message : "unknown error",
    );
    throw new DownloadFileNotFoundError();
  }

  return {
    stream,
    fileName: sanitizeDownloadFileName(productFile.fileName),
    sizeBytes: productFile.sizeBytes,
  };
}
