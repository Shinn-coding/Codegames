/**
 * Pure upload validation shared by the admin upload route and its tests.
 *
 * A file is accepted only when its extension, declared type, and leading bytes
 * agree. Renaming an executable to `.zip` therefore fails closed, and the
 * declared `Content-Type` from the browser is never trusted on its own.
 */

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export type UploadKind = "zip" | "pdf" | "text";

export type DetectedUpload = {
  kind: UploadKind;
  extension: "zip" | "pdf" | "txt" | "md";
  mimeType: string;
};

const ZIP_EXTENSIONS = new Set(["zip"]);
const PDF_EXTENSIONS = new Set(["pdf"]);
const TEXT_EXTENSIONS = new Set(["txt", "md"]);

export function getFileExtension(fileName: string): string {
  const match = /\.([A-Za-z0-9]+)$/.exec(fileName.trim());
  return match?.[1]?.toLowerCase() ?? "";
}

function isZipSignature(bytes: Uint8Array): boolean {
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    return false;
  }

  const third = bytes[2];
  const fourth = bytes[3];

  return (
    (third === 0x03 && fourth === 0x04) ||
    (third === 0x05 && fourth === 0x06) ||
    (third === 0x07 && fourth === 0x08)
  );
}

function isPdfSignature(bytes: Uint8Array): boolean {
  const signature = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  return signature.every((value, index) => bytes[index] === value);
}

function isPlainText(bytes: Uint8Array): boolean {
  if (bytes.includes(0)) {
    return false;
  }

  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }
}

export function detectUpload(
  bytes: Uint8Array,
  fileName: string,
): DetectedUpload | null {
  const extension = getFileExtension(fileName);

  if (ZIP_EXTENSIONS.has(extension) && isZipSignature(bytes)) {
    return { kind: "zip", extension: "zip", mimeType: "application/zip" };
  }

  if (PDF_EXTENSIONS.has(extension) && isPdfSignature(bytes)) {
    return { kind: "pdf", extension: "pdf", mimeType: "application/pdf" };
  }

  if (
    TEXT_EXTENSIONS.has(extension) &&
    isPlainText(bytes) &&
    bytes.length > 0
  ) {
    return {
      kind: "text",
      extension: extension as "txt" | "md",
      mimeType: "text/plain; charset=utf-8",
    };
  }

  return null;
}

/**
 * Reduce a browser-supplied file name to a safe, displayable base name. The
 * storage key is generated separately, so the original name is only used for
 * the download header and the admin list.
 */
export function sanitizeUploadFileName(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "file";
  const cleaned = base
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^[-.]+/, "")
    .replace(/[-.]+$/, "")
    .slice(0, 120);

  return cleaned.length > 0 ? cleaned : "file";
}

const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_VERSION = /^[0-9A-Za-z][0-9A-Za-z._-]{0,39}$/;

export function buildProductStorageKey(input: {
  slug: string;
  version: string;
  extension: string;
  randomId: string;
}): string {
  if (!SAFE_SLUG.test(input.slug)) {
    throw new Error("Invalid product slug for a storage key.");
  }

  if (!SAFE_VERSION.test(input.version)) {
    throw new Error("Invalid version for a storage key.");
  }

  if (!/^[A-Za-z0-9]{1,16}$/.test(input.extension)) {
    throw new Error("Invalid file extension for a storage key.");
  }

  if (!/^[A-Za-z0-9]{1,32}$/.test(input.randomId)) {
    throw new Error("Invalid random identifier for a storage key.");
  }

  return `products/${input.slug}/${input.slug}-${input.version}-${input.randomId}.${input.extension}`;
}
