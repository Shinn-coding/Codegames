import assert from "node:assert/strict";
import test from "node:test";

import {
  DOWNLOAD_TOKEN_MAX_USES,
  DOWNLOAD_TOKEN_TTL_MS,
  canDownloadLicense,
  contentDispositionAttachment,
  generateDownloadToken,
  getDownloadTokenUseStatus,
  hashDownloadToken,
  isLicenseOwner,
  isValidDownloadTokenFormat,
  redactDownloadTokens,
  sanitizeDownloadFileName,
} from "../src/lib/download-core.ts";

test("generates a 32-byte base64url bearer token and stores only its hash", () => {
  const token = generateDownloadToken((size) =>
    Uint8Array.from({ length: size }, (_, index) => index),
  );

  assert.equal(token.length, 43);
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(isValidDownloadTokenFormat(token), true);

  const digest = hashDownloadToken(token);
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.notEqual(digest, token);
  assert.equal(hashDownloadToken(token), digest);
  assert.notEqual(hashDownloadToken(`${token}x`), digest);
});

test("rejects malformed download tokens and bad random sources", () => {
  for (const token of [
    "",
    "short",
    "a".repeat(42),
    "a".repeat(44),
    `${"a".repeat(42)}=`,
    "a".repeat(42) + "/",
  ]) {
    assert.equal(isValidDownloadTokenFormat(token), false, token);
  }

  assert.throws(
    () => generateDownloadToken(() => new Uint8Array(16)),
    /expected 32/,
  );
});

test("expires a token at the 30-minute boundary", () => {
  const now = new Date("2026-10-22T12:00:00.000Z");
  const expiresAt = new Date(now.getTime() + DOWNLOAD_TOKEN_TTL_MS);

  assert.equal(
    getDownloadTokenUseStatus({
      expiresAt,
      usedCount: 0,
      maxUses: DOWNLOAD_TOKEN_MAX_USES,
      now,
    }),
    "valid",
  );
  assert.equal(
    getDownloadTokenUseStatus({
      expiresAt: new Date(now.getTime() - 1),
      usedCount: 0,
      maxUses: DOWNLOAD_TOKEN_MAX_USES,
      now,
    }),
    "expired",
  );
  assert.equal(
    getDownloadTokenUseStatus({
      expiresAt,
      usedCount: 0,
      maxUses: DOWNLOAD_TOKEN_MAX_USES,
      now: expiresAt,
    }),
    "expired",
  );
});

test("rejects over-use at the max-use limit", () => {
  const expiresAt = new Date(Date.now() + DOWNLOAD_TOKEN_TTL_MS);

  assert.equal(
    getDownloadTokenUseStatus({
      expiresAt,
      usedCount: 1,
      maxUses: DOWNLOAD_TOKEN_MAX_USES,
    }),
    "valid",
  );
  assert.equal(
    getDownloadTokenUseStatus({
      expiresAt,
      usedCount: 2,
      maxUses: DOWNLOAD_TOKEN_MAX_USES,
    }),
    "exhausted",
  );
  assert.equal(
    getDownloadTokenUseStatus({
      expiresAt,
      usedCount: 3,
      maxUses: DOWNLOAD_TOKEN_MAX_USES,
    }),
    "exhausted",
  );
});

test("rejects downloads for unpaid, refunded, or inactive licenses", () => {
  const now = new Date("2026-10-22T12:00:00.000Z");

  assert.equal(
    canDownloadLicense({
      licenseStatus: "ACTIVE",
      orderStatus: "PAID",
      now,
    }),
    true,
  );
  assert.equal(
    canDownloadLicense({
      licenseStatus: "ACTIVE",
      orderStatus: "PENDING",
      now,
    }),
    false,
  );
  assert.equal(
    canDownloadLicense({
      licenseStatus: "ACTIVE",
      orderStatus: "REFUNDED",
      now,
    }),
    false,
  );
  assert.equal(
    canDownloadLicense({
      licenseStatus: "REVOKED",
      orderStatus: "PAID",
      now,
    }),
    false,
  );
  assert.equal(
    canDownloadLicense({
      licenseStatus: "ACTIVE",
      orderStatus: "PAID",
      licenseExpiresAt: new Date(now.getTime() - 1),
      now,
    }),
    false,
  );
});

test("only the license owner can create a download", () => {
  assert.equal(isLicenseOwner("user-1", "user-1"), true);
  assert.equal(isLicenseOwner("user-1", "user-2"), false);
  assert.equal(isLicenseOwner(null, "user-1"), false);
  assert.equal(isLicenseOwner(undefined, "user-1"), false);
  assert.equal(isLicenseOwner("", "user-1"), false);
});

test("sanitizes attachment filenames and builds a safe header", () => {
  assert.equal(
    sanitizeDownloadFileName('../../CodeGems "Kit": 1.0.zip'),
    "..-..-CodeGems -Kit-- 1.0.zip",
  );
  assert.equal(sanitizeDownloadFileName("\r\n"), "download.bin");
  assert.equal(
    contentDispositionAttachment("CodeGems Kit 1.0.txt"),
    "attachment; filename=\"CodeGems Kit 1.0.txt\"; filename*=UTF-8''CodeGems%20Kit%201.0.txt",
  );
  assert.equal(
    contentDispositionAttachment('bad"name\r\n.txt'),
    "attachment; filename=\"bad-name.txt\"; filename*=UTF-8''bad-name.txt",
  );
});

test("redacts bearer download tokens from console email logs", () => {
  const token = "rkmSIZ7HcY8UcEJIcTpjzPaEdmw-m4pR1uv9TImB0Wk";
  const message = [
    "Download: http://localhost:3000/api/download/" + token,
    "Receipt: http://localhost:3000/checkout/success?order=CG-1",
  ].join("\n");

  const redacted = redactDownloadTokens(message);

  assert.equal(redacted.includes(token), false);
  assert.match(redacted, /\/api\/download\/\[redacted\]/);
  assert.match(redacted, /checkout\/success\?order=CG-1/);
});
