import { createHmac, randomBytes as nodeRandomBytes } from "node:crypto";

/**
 * License keys use Crockford Base32: the digits plus A-Z without I, L, O, and
 * U. Sixteen random characters carry 80 bits of entropy (5 bits per symbol).
 */
export const LICENSE_KEY_PREFIX = "GABUT";
export const LICENSE_KEY_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const LICENSE_KEY_BODY_LENGTH = 16;

const GROUPS = 4;
const GROUP_LENGTH = 4;
const LICENSE_KEY_PATTERN = new RegExp(
  `^${LICENSE_KEY_PREFIX}(?:-[0-9A-HJKMNP-TV-Z]{${GROUP_LENGTH}}){${GROUPS}}$`,
);
const LICENSE_KEY_REDACTION_PATTERN = new RegExp(
  `\\b${LICENSE_KEY_PREFIX}(?:-[0-9A-HJKMNP-TV-Z]{${GROUP_LENGTH}}){${GROUPS}}\\b`,
  "g",
);

export type RandomBytes = (size: number) => Uint8Array;

function randomBody(random: RandomBytes): string {
  const bytes = random(LICENSE_KEY_BODY_LENGTH);

  if (bytes.length < LICENSE_KEY_BODY_LENGTH) {
    throw new Error("Random source returned too few bytes for a license key.");
  }

  let body = "";
  for (let index = 0; index < LICENSE_KEY_BODY_LENGTH; index += 1) {
    // 256 is exactly divisible by 32, so masking five bits is unbiased.
    body += LICENSE_KEY_ALPHABET[bytes[index]! & 31];
  }

  return body;
}

export function generateLicenseKey(
  random: RandomBytes = (size) => nodeRandomBytes(size),
): string {
  const body = randomBody(random);
  const groups = Array.from({ length: GROUPS }, (_, index) =>
    body.slice(index * GROUP_LENGTH, (index + 1) * GROUP_LENGTH),
  );

  return `${LICENSE_KEY_PREFIX}-${groups.join("-")}`;
}

/**
 * Trim, upper-case, and resolve the Crockford aliases users commonly type.
 * Invalid characters are deliberately not removed: a malformed key should
 * fail validation rather than silently become a different key.
 */
export function normalizeLicenseKey(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replaceAll("O", "0")
    .replaceAll("I", "1")
    .replaceAll("L", "1");
}

export function isValidLicenseKeyFormat(value: string): boolean {
  return LICENSE_KEY_PATTERN.test(normalizeLicenseKey(value));
}

export function hashLicenseKey(value: string, secret: string): string {
  if (!secret) {
    throw new Error("A license HMAC secret is required.");
  }

  return createHmac("sha256", secret)
    .update(normalizeLicenseKey(value), "utf8")
    .digest("hex");
}

export type LicenseKeyMetadata = {
  keyPrefix: string;
  keyLast4: string;
};

export function getLicenseKeyMetadata(value: string): LicenseKeyMetadata {
  const normalized = normalizeLicenseKey(value);

  if (!LICENSE_KEY_PATTERN.test(normalized)) {
    throw new Error("Cannot read metadata from an invalid license key.");
  }

  return {
    keyPrefix: LICENSE_KEY_PREFIX,
    keyLast4: normalized.slice(-4),
  };
}

export function maskLicenseKey(parts: {
  keyPrefix: string;
  keyLast4: string;
}): string {
  return `${parts.keyPrefix}-••••-••••-••••-${parts.keyLast4}`;
}

/** Keep the license key out of console logs and diagnostics. */
export function redactLicenseKeys(value: string): string {
  return value.replace(LICENSE_KEY_REDACTION_PATTERN, (match) => {
    return `${LICENSE_KEY_PREFIX}-••••-••••-••••-${match.slice(-4)}`;
  });
}
