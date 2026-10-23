import { createHash, randomBytes } from "node:crypto";

export const DOWNLOAD_TOKEN_BYTES = 32;
export const DOWNLOAD_TOKEN_TTL_MS = 30 * 60 * 1_000;
export const DOWNLOAD_TOKEN_MAX_USES = 2;

export type DownloadLicenseStatus = "ACTIVE" | "REVOKED" | "EXPIRED";
export type DownloadOrderStatus =
  "PENDING" | "PAID" | "EXPIRED" | "FAILED" | "REFUNDED";

export type DownloadTokenUseStatus = "valid" | "expired" | "exhausted";

type RandomBytes = (size: number) => Uint8Array;

/**
 * A download token is a bearer secret. Only its SHA-256 digest is persisted;
 * the raw value is returned to the owner once when the link is created.
 */
export function generateDownloadToken(
  random: RandomBytes = (size) => randomBytes(size),
): string {
  const bytes = random(DOWNLOAD_TOKEN_BYTES);

  if (bytes.byteLength !== DOWNLOAD_TOKEN_BYTES) {
    throw new Error(
      `Download token random source returned ${bytes.byteLength} bytes, expected ${DOWNLOAD_TOKEN_BYTES}.`,
    );
  }

  return Buffer.from(bytes).toString("base64url");
}

export function hashDownloadToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isValidDownloadTokenFormat(token: string): boolean {
  // 32 random bytes encode to exactly 43 unpadded base64url characters.
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

const DOWNLOAD_URL_TOKEN_PATTERN = /\/api\/download\/[A-Za-z0-9_-]{43}/g;

/**
 * Console email logs must not contain bearer secrets. This keeps the mock
 * provider safe to use in development while leaving real delivery untouched.
 */
export function redactDownloadTokens(value: string): string {
  return value.replace(DOWNLOAD_URL_TOKEN_PATTERN, "/api/download/[redacted]");
}

export function getDownloadTokenUseStatus(input: {
  expiresAt: Date;
  usedCount: number;
  maxUses: number;
  now?: Date;
}): DownloadTokenUseStatus {
  const now = input.now ?? new Date();

  if (input.expiresAt.getTime() <= now.getTime()) {
    return "expired";
  }

  if (input.usedCount >= input.maxUses) {
    return "exhausted";
  }

  return "valid";
}

export function canDownloadLicense(input: {
  licenseStatus: DownloadLicenseStatus;
  orderStatus: DownloadOrderStatus;
  licenseExpiresAt?: Date | null;
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();

  return (
    input.licenseStatus === "ACTIVE" &&
    input.orderStatus === "PAID" &&
    (!input.licenseExpiresAt ||
      input.licenseExpiresAt.getTime() > now.getTime())
  );
}

export function isLicenseOwner(
  licenseUserId: string | null | undefined,
  userId: string,
): boolean {
  return Boolean(licenseUserId && userId && licenseUserId === userId);
}

export function sanitizeDownloadFileName(value: string): string {
  const cleaned = value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .trim();

  return cleaned.slice(0, 180) || "download.bin";
}

export function contentDispositionAttachment(fileName: string): string {
  const safeName = sanitizeDownloadFileName(fileName);
  const asciiName = safeName
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
  const encodedName = encodeURIComponent(safeName).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`;
}
