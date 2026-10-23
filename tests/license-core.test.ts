import assert from "node:assert/strict";
import test from "node:test";

import {
  generateLicenseKey,
  getLicenseKeyMetadata,
  hashLicenseKey,
  isValidLicenseKeyFormat,
  maskLicenseKey,
  normalizeLicenseKey,
  redactLicenseKeys,
} from "../src/lib/license-core.ts";

const FIXED_SECRET = "a".repeat(32);
const SAMPLE_KEY = "GABUT-0123-4567-89AB-CDEF";

test("generates a 16-character Crockford Base32 key in the documented format", () => {
  const key = generateLicenseKey((size) =>
    Uint8Array.from({ length: size }, (_, index) => index),
  );

  assert.equal(key, SAMPLE_KEY);
  assert.equal(isValidLicenseKeyFormat(key), true);
  assert.match(key, /^GABUT(?:-[0-9A-HJKMNP-TV-Z]{4}){4}$/);
});

test("maps random bytes without bias and supports fixed test vectors", () => {
  assert.equal(
    generateLicenseKey((size) => new Uint8Array(size)),
    "GABUT-0000-0000-0000-0000",
  );
});

test("does not repeat keys across a large sample", () => {
  const keys = new Set(
    Array.from({ length: 2_000 }, () => generateLicenseKey()),
  );

  assert.equal(keys.size, 2_000);
});

test("normalizes case and Crockford aliases", () => {
  assert.equal(
    normalizeLicenseKey(" gabut-o123-i456-l789-0abc "),
    "GABUT-0123-1456-1789-0ABC",
  );
  assert.equal(isValidLicenseKeyFormat("gabut-0123-4567-89ab-cdef"), true);
});

test("rejects malformed keys instead of silently repairing them", () => {
  for (const value of [
    "",
    "GABUT-0123-4567-89AB",
    "GABUT-0123-4567-89AB-CDEU",
    "GABUT_0123_4567_89AB_CDEF",
    "GABUT-0123-4567-89AB-CDEF-EXTRA",
    "not-a-license",
  ]) {
    assert.equal(isValidLicenseKeyFormat(value), false, value);
  }
});

test("hashes with HMAC-SHA256 and a secret", () => {
  assert.equal(
    hashLicenseKey(SAMPLE_KEY, FIXED_SECRET),
    "bb2bfda084409b9620a225187b9dddab60ddb2a7e410896f08ef736755ce6356",
  );
  assert.equal(
    hashLicenseKey("gabut-0123-4567-89ab-cdef", FIXED_SECRET),
    hashLicenseKey(SAMPLE_KEY, FIXED_SECRET),
  );
  assert.notEqual(
    hashLicenseKey(SAMPLE_KEY, FIXED_SECRET),
    hashLicenseKey(SAMPLE_KEY, "b".repeat(32)),
  );
  assert.notEqual(
    hashLicenseKey(SAMPLE_KEY, FIXED_SECRET),
    hashLicenseKey("GABUT-0123-4567-89AB-CDE0", FIXED_SECRET),
  );
  assert.throws(() => hashLicenseKey(SAMPLE_KEY, ""), /secret is required/);
});

test("stores only a prefix and last four characters for masked display", () => {
  assert.deepEqual(getLicenseKeyMetadata(SAMPLE_KEY), {
    keyPrefix: "GABUT",
    keyLast4: "CDEF",
  });
  assert.equal(
    maskLicenseKey(getLicenseKeyMetadata(SAMPLE_KEY)),
    "GABUT-••••-••••-••••-CDEF",
  );
  assert.throws(
    () => getLicenseKeyMetadata("GABUT-0123"),
    /invalid license key/,
  );
});

test("redacts full keys from diagnostic output", () => {
  assert.equal(
    redactLicenseKeys(`License: ${SAMPLE_KEY}. Keep it safe.`),
    "License: GABUT-••••-••••-••••-CDEF. Keep it safe.",
  );
});
