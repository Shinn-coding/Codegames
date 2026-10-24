import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_UPLOAD_BYTES,
  buildProductStorageKey,
  detectUpload,
  getFileExtension,
  sanitizeUploadFileName,
  validateProductUploadTarget,
} from "../src/lib/upload-core.ts";

function bytes(...values: number[]): Uint8Array {
  return Uint8Array.from(values);
}

const zipBytes = bytes(0x50, 0x4b, 0x03, 0x04, 0x14, 0x00);
const pdfBytes = new TextEncoder().encode("%PDF-1.7\nbody");
const textBytes = new TextEncoder().encode("hello, product\n");

test("detects a zip by its signature and extension", () => {
  const result = detectUpload(zipBytes, "codegems.zip");

  assert.deepEqual(result, {
    kind: "zip",
    extension: "zip",
    mimeType: "application/zip",
  });
});

test("detects a pdf by its signature and extension", () => {
  assert.equal(detectUpload(pdfBytes, "docs.pdf")?.kind, "pdf");
});

test("accepts readable text with a .txt or .md extension", () => {
  assert.equal(detectUpload(textBytes, "readme.txt")?.kind, "text");
  assert.equal(detectUpload(textBytes, "readme.md")?.kind, "text");
});

test("rejects an executable renamed to .zip", () => {
  const executable = bytes(0x4d, 0x5a, 0x90, 0x00); // MZ header
  assert.equal(detectUpload(executable, "installer.zip"), null);
});

test("rejects a signature that does not match the extension", () => {
  assert.equal(detectUpload(pdfBytes, "archive.zip"), null);
  assert.equal(detectUpload(zipBytes, "document.pdf"), null);
});

test("rejects text with binary content", () => {
  assert.equal(detectUpload(bytes(0x68, 0x00, 0x69), "notes.txt"), null);
  assert.equal(detectUpload(new Uint8Array(), "empty.txt"), null);
});

test("rejects unsupported extensions even with a known signature", () => {
  assert.equal(detectUpload(zipBytes, "archive.rar"), null);
  assert.equal(detectUpload(textBytes, "script.sh"), null);
});

test("exposes a 50 MB upload ceiling", () => {
  assert.equal(MAX_UPLOAD_BYTES, 50 * 1024 * 1024);
});

test("reads and lowercases the extension", () => {
  assert.equal(getFileExtension("Release.ZIP"), "zip");
  assert.equal(getFileExtension("no-extension"), "");
});

test("strips paths and unsafe characters from a file name", () => {
  assert.equal(sanitizeUploadFileName("../../etc/passwd"), "passwd");
  assert.equal(
    sanitizeUploadFileName("C:\\Users\\me\\My Kit (v2).zip"),
    "My-Kit-v2-.zip",
  );
  assert.equal(sanitizeUploadFileName("!!!"), "file");
});

test("builds a slug-scoped storage key", () => {
  const key = buildProductStorageKey({
    slug: "nextjs-saas-starter",
    version: "1.2.0",
    extension: "zip",
    randomId: "abc123def456",
  });

  assert.equal(
    key,
    "products/nextjs-saas-starter/nextjs-saas-starter-1.2.0-abc123def456.zip",
  );
});

test("validates a client-supplied Blob upload target", () => {
  const base = {
    pathname:
      "products/nextjs-saas-starter/nextjs-saas-starter-1.2.0-abc123def456.zip",
    slug: "nextjs-saas-starter",
    version: "1.2.0",
    fileName: "release.zip",
  };

  assert.deepEqual(validateProductUploadTarget(base), {
    fileName: "release.zip",
    extension: "zip",
  });

  assert.equal(
    validateProductUploadTarget({
      ...base,
      pathname:
        "products/another-product/another-product-1.2.0-abc123def456.zip",
    }),
    null,
  );
  assert.equal(
    validateProductUploadTarget({ ...base, version: "../../1.0.0" }),
    null,
  );
  assert.equal(
    validateProductUploadTarget({ ...base, fileName: "release.exe" }),
    null,
  );
  assert.equal(
    validateProductUploadTarget({
      ...base,
      pathname: "products/nextjs-saas-starter/../secret.zip",
    }),
    null,
  );
});

test("rejects traversal or unsafe key parts", () => {
  const base = {
    slug: "nextjs-saas-starter",
    version: "1.0.0",
    extension: "zip",
    randomId: "abc123",
  };

  assert.throws(() =>
    buildProductStorageKey({ ...base, slug: "../evil" }),
  );
  assert.throws(() =>
    buildProductStorageKey({ ...base, version: "../../1.0.0" }),
  );
  assert.throws(() =>
    buildProductStorageKey({ ...base, extension: "z/ip" }),
  );
  assert.throws(() =>
    buildProductStorageKey({ ...base, randomId: "../abc" }),
  );
});
