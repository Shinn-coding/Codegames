import { createHash } from "node:crypto";

import { PDFDocument } from "pdf-lib";
import yauzl, { type Entry, type ZipFile } from "yauzl";

import type { DetectedUpload } from "@/lib/upload-core";

/**
 * Static analysis for admin uploads.
 *
 * This is intentionally a quarantine gate, not a promise that a file is safe.
 * Every upload still needs an explicit admin approval before it can become the
 * current delivery file. The analyzer only reads the bytes in memory, keeps
 * archive extraction bounded, and never executes uploaded content.
 */

export type UploadFindingSeverity = "block" | "warn" | "info";

export type UploadFinding = {
  code: string;
  severity: UploadFindingSeverity;
  message: string;
  path?: string;
};

export type UploadScanStatus =
  "PENDING" | "CLEAN" | "SUSPICIOUS" | "BLOCKED" | "ERROR";

export type UploadScanReport = {
  status: UploadScanStatus;
  scannedAt: string;
  kind: DetectedUpload["kind"];
  extension: DetectedUpload["extension"];
  sizeBytes: number;
  sha256: string;
  findings: UploadFinding[];
  metadata: Record<string, unknown>;
};

export const MAX_ARCHIVE_ENTRIES = 5_000;
export const MAX_ARCHIVE_UNCOMPRESSED_BYTES = 250 * 1024 * 1024;
export const MAX_ARCHIVE_COMPRESSION_RATIO = 100;
export const MAX_ENTRY_TEXT_BYTES = 512 * 1024;
export const MAX_TEXT_SCAN_BYTES = 2 * 1024 * 1024;

const BLOCKED_EXTENSIONS = new Set([
  "app",
  "appx",
  "apk",
  "bat",
  "cmd",
  "com",
  "cpl",
  "deb",
  "dll",
  "dmg",
  "exe",
  "hta",
  "img",
  "iso",
  "jar",
  "jse",
  "lnk",
  "msi",
  "msix",
  "msixbundle",
  "msp",
  "pif",
  "ps1",
  "psm1",
  "rpm",
  "scr",
  "vbe",
  "vbs",
  "vhd",
  "vhdx",
  "wsf",
  "wsh",
]);

const MACRO_EXTENSIONS = new Set([
  "docm",
  "dotm",
  "potm",
  "pptm",
  "xlam",
  "xlsm",
  "xltm",
]);

const SENSITIVE_EXTENSIONS = new Set(["jks", "keystore", "p12", "pfx", "pem"]);

const TEXT_EXTENSIONS = new Set([
  "bash",
  "cjs",
  "conf",
  "css",
  "csv",
  "env",
  "html",
  "ini",
  "js",
  "json",
  "jsx",
  "md",
  "mjs",
  "npmrc",
  "php",
  "ps1",
  "py",
  "rb",
  "sh",
  "sql",
  "toml",
  "ts",
  "tsx",
  "txt",
  "xml",
  "yaml",
  "yml",
  "zsh",
]);

const NESTED_ARCHIVE_EXTENSIONS = new Set([
  "7z",
  "bz2",
  "gz",
  "rar",
  "tar",
  "tgz",
  "xz",
  "zip",
]);

const LIFECYCLE_SCRIPT_NAMES = new Set([
  "preinstall",
  "install",
  "postinstall",
  "prepare",
  "prepack",
  "postpack",
]);

const SUSPICIOUS_COMMAND_PATTERNS: Array<{
  pattern: RegExp;
  message: string;
}> = [
  {
    pattern: /\b(curl|wget)\b[^\n|]*\|\s*(?:ba)?sh\b/i,
    message: "Downloads and executes a remote shell command.",
  },
  {
    pattern: /\b(powershell|pwsh)\b[^\n]*(?:-enc|-encodedcommand)\b/i,
    message: "Runs a PowerShell command from an encoded payload.",
  },
  {
    pattern:
      /\b(?:base64|openssl)\b[^\n]*(?:-d|-decode)[^\n]*\|\s*(?:ba)?sh\b/i,
    message: "Decodes a payload and pipes it to a shell.",
  },
  {
    pattern: /\b(chmod|chown)\b[^\n]*\+x\b/i,
    message: "Marks an extracted file as executable.",
  },
  {
    pattern: /\b(?:child_process|execSync|spawnSync|execFileSync)\b/i,
    message: "Uses a process execution API.",
  },
  {
    pattern: /\bInvoke-Expression\b/i,
    message: "Uses PowerShell dynamic execution.",
  },
];

const SECRET_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
    message: "Contains a private key.",
  },
  {
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
    message: "Contains an AWS access key.",
  },
  {
    pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/,
    message: "Contains a GitHub token.",
  },
  {
    pattern: /\bsk_live_[0-9A-Za-z]{16,}\b/,
    message: "Contains a Stripe live secret key.",
  },
  {
    pattern: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/,
    message: "Contains a Slack token.",
  },
];

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function extensionOf(fileName: string): string {
  const match = /\.([A-Za-z0-9]+)$/.exec(fileName.trim());
  return match?.[1]?.toLowerCase() ?? "";
}

function isPlaceholder(value: string): boolean {
  return /\b(?:example|placeholder|changeme|change-me|your[_-]?|dummy|sample|test)\b/i.test(
    value,
  );
}

function finding(
  findings: UploadFinding[],
  severity: UploadFindingSeverity,
  code: string,
  message: string,
  path?: string,
): void {
  if (
    findings.some(
      (item) =>
        item.code === code && item.path === path && item.message === message,
    )
  ) {
    return;
  }

  findings.push({ code, severity, message, ...(path ? { path } : {}) });
}

function inspectFileName(
  name: string,
  findings: UploadFinding[],
): string | null {
  if (!name) {
    finding(
      findings,
      "block",
      "empty_entry_name",
      "Archive contains an empty entry name.",
    );
    return null;
  }

  if (name.includes("\0")) {
    finding(
      findings,
      "block",
      "nul_in_entry_name",
      "Archive contains a null byte in an entry name.",
      name,
    );
    return null;
  }

  const normalized = name.replace(/\\/g, "/");

  if (normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized)) {
    finding(
      findings,
      "block",
      "absolute_entry_path",
      "Archive contains an absolute path.",
      name,
    );
  }

  if (normalized.split("/").some((part) => part === "..")) {
    finding(
      findings,
      "block",
      "path_traversal",
      "Archive contains a path traversal entry.",
      name,
    );
  }

  if (/[\u202a-\u202e\u2066-\u2069]/.test(name)) {
    finding(
      findings,
      "warn",
      "bidi_control_characters",
      "Archive entry name contains bidirectional control characters.",
      name,
    );
  }

  return normalized;
}

function inspectEntryName(name: string, findings: UploadFinding[]): void {
  const normalized = inspectFileName(name, findings);

  if (!normalized) {
    return;
  }

  const lower = normalized.toLowerCase();
  const extension = extensionOf(lower);
  const baseName = lower.split("/").pop() ?? lower;

  if (BLOCKED_EXTENSIONS.has(extension)) {
    finding(
      findings,
      "block",
      "executable_entry",
      `Archive contains an executable file (.${extension}).`,
      normalized,
    );
  }

  if (MACRO_EXTENSIONS.has(extension)) {
    finding(
      findings,
      "block",
      "macro_entry",
      `Archive contains a macro-enabled Office file (.${extension}).`,
      normalized,
    );
  }

  if (NESTED_ARCHIVE_EXTENSIONS.has(extension)) {
    finding(
      findings,
      "block",
      "nested_archive",
      `Archive contains a nested archive (.${extension}).`,
      normalized,
    );
  }

  if (
    /^\.env(?:\.|$)/.test(baseName) &&
    !/^\.env\.(?:example|sample|template)$/.test(baseName)
  ) {
    finding(
      findings,
      "block",
      "env_file",
      "Archive contains a .env file that may hold live secrets.",
      normalized,
    );
  }

  if (/(^|\/)\.git\//.test(lower) || /(^|\/)\.ssh\//.test(lower)) {
    finding(
      findings,
      "block",
      "private_metadata",
      "Archive contains private repository or SSH metadata.",
      normalized,
    );
  }

  if (
    baseName === "id_rsa" ||
    baseName === "id_ed25519" ||
    baseName === "id_dsa" ||
    baseName === "id_ecdsa"
  ) {
    finding(
      findings,
      "block",
      "private_key_file",
      "Archive contains an SSH private key.",
      normalized,
    );
  } else if (SENSITIVE_EXTENSIONS.has(extension)) {
    finding(
      findings,
      "warn",
      "sensitive_key_file",
      `Archive contains a key or certificate file (.${extension}). Review it before approving.`,
      normalized,
    );
  }

  if (baseName === ".npmrc") {
    finding(
      findings,
      "warn",
      "npmrc_file",
      "Archive contains .npmrc, which may hold registry credentials.",
      normalized,
    );
  }

  if (/(^|\/)node_modules\//.test(lower)) {
    finding(
      findings,
      "info",
      "node_modules_present",
      "Archive includes node_modules; review the bundle size and contents.",
      normalized,
    );
  }

  if (/\.(?:tar\.gz|tar\.bz2|tar\.xz)$/.test(lower)) {
    finding(
      findings,
      "block",
      "nested_archive",
      "Archive contains a nested compressed archive.",
      normalized,
    );
  }

  if (extension && /[a-z0-9]\.[a-z0-9]+$/.test(baseName)) {
    const doubleExtension = extensionOf(
      baseName.slice(0, -extension.length - 1),
    );
    if (BLOCKED_EXTENSIONS.has(doubleExtension)) {
      finding(
        findings,
        "block",
        "double_extension",
        `Archive entry uses a double extension (.${doubleExtension}.${extension}).`,
        normalized,
      );
    }
  }
}

function findSecret(
  text: string,
  path: string,
  findings: UploadFinding[],
): void {
  for (const { pattern, message } of SECRET_PATTERNS) {
    const match = pattern.exec(text);

    if (match && !isPlaceholder(match[0])) {
      finding(findings, "warn", "possible_secret", message, path);
    }
  }
}

function inspectTextContent(
  text: string,
  path: string,
  findings: UploadFinding[],
): void {
  const lower = text.toLowerCase();

  if (text.includes("\uFFFD")) {
    finding(
      findings,
      "warn",
      "non_utf8_text",
      "Text appears to contain binary or invalid UTF-8 data.",
      path,
    );
  }

  if (
    /<script\b/i.test(text) ||
    /\bjavascript\s*:/i.test(text) ||
    /\bon(?:error|load|click)\s*=/i.test(text)
  ) {
    finding(
      findings,
      "warn",
      "active_html_content",
      "Text file contains active HTML or JavaScript content.",
      path,
    );
  }

  if (
    /\b(?:curl|wget)\b[^\n|]*\|\s*(?:ba)?sh\b/i.test(text) ||
    /\b(?:base64|openssl)\b[^\n]*(?:-d|-decode)[^\n]*\|\s*(?:ba)?sh\b/i.test(
      text,
    )
  ) {
    finding(
      findings,
      "warn",
      "remote_shell_pattern",
      "Text file contains a download-and-execute shell pattern.",
      path,
    );
  }

  for (const { pattern, message } of SUSPICIOUS_COMMAND_PATTERNS) {
    if (pattern.test(text)) {
      finding(findings, "warn", "suspicious_command", message, path);
    }
  }

  findSecret(text, path, findings);

  if (lower.includes("-----begin pgp private key block-----")) {
    finding(
      findings,
      "warn",
      "possible_secret",
      "Contains a private PGP key.",
      path,
    );
  }
}

async function readEntryText(
  zipfile: ZipFile,
  entry: Entry,
  maxBytes: number,
): Promise<string | null> {
  if (entry.uncompressedSize > maxBytes) {
    return null;
  }

  const stream = await zipfile.openReadStreamPromise(entry);
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;

    if (total > maxBytes) {
      stream.destroy();
      return null;
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function inspectPackageJson(
  text: string,
  path: string,
  findings: UploadFinding[],
): void {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    finding(
      findings,
      "warn",
      "invalid_package_json",
      "package.json is not valid JSON.",
      path,
    );
    return;
  }

  if (!parsed || typeof parsed !== "object") {
    return;
  }

  const scripts = (parsed as { scripts?: unknown }).scripts;

  if (!scripts || typeof scripts !== "object") {
    return;
  }

  for (const [name, command] of Object.entries(scripts)) {
    if (typeof command !== "string") {
      continue;
    }

    if (LIFECYCLE_SCRIPT_NAMES.has(name)) {
      finding(
        findings,
        "warn",
        "package_lifecycle_script",
        `package.json runs a ${name} script. Review it before approving.`,
        path,
      );
    }

    for (const { pattern, message } of SUSPICIOUS_COMMAND_PATTERNS) {
      if (pattern.test(command)) {
        finding(
          findings,
          "warn",
          "package_script_command",
          `${name} script: ${message}`,
          path,
        );
      }
    }
  }
}

async function inspectZip(
  bytes: Uint8Array,
  findings: UploadFinding[],
  metadata: Record<string, unknown>,
): Promise<void> {
  const zipfile = await yauzl.fromBufferPromise(Buffer.from(bytes), {
    autoClose: false,
    lazyEntries: true,
    decodeStrings: true,
    validateEntrySizes: true,
    strictFileNames: true,
  });

  let entryCount = 0;
  let uncompressedBytes = 0;
  let textBytesScanned = 0;

  try {
    if (zipfile.entryCount > MAX_ARCHIVE_ENTRIES) {
      finding(
        findings,
        "block",
        "too_many_entries",
        `Archive contains more than ${MAX_ARCHIVE_ENTRIES} entries.`,
      );
    }

    for await (const entry of zipfile.eachEntry()) {
      entryCount += 1;
      uncompressedBytes += entry.uncompressedSize;

      if (entryCount > MAX_ARCHIVE_ENTRIES) {
        finding(
          findings,
          "block",
          "too_many_entries",
          `Archive contains more than ${MAX_ARCHIVE_ENTRIES} entries.`,
        );
        break;
      }

      if (uncompressedBytes > MAX_ARCHIVE_UNCOMPRESSED_BYTES) {
        finding(
          findings,
          "block",
          "archive_too_large",
          "Archive expands beyond the 250 MB analysis limit.",
        );
        break;
      }

      inspectEntryName(entry.fileName, findings);

      const encrypted =
        entry.isEncrypted() || (entry.generalPurposeBitFlag & 0x1) === 1;

      if (encrypted) {
        finding(
          findings,
          "block",
          "encrypted_archive",
          "Archive is encrypted or password-protected.",
          entry.fileName,
        );
      }

      const unsupportedCompression =
        entry.compressionMethod !== 0 && entry.compressionMethod !== 8;

      if (unsupportedCompression) {
        finding(
          findings,
          "block",
          "unsupported_compression",
          "Archive uses an unsupported compression method.",
          entry.fileName,
        );
      }

      const mode = (entry.externalFileAttributes >>> 16) & 0o170000;
      const symlink = mode === 0o120000;

      if (symlink) {
        finding(
          findings,
          "block",
          "symlink_entry",
          "Archive contains a symbolic link.",
          entry.fileName,
        );
      }

      if (entry.fileName.endsWith("/")) {
        continue;
      }

      if (encrypted || unsupportedCompression || symlink) {
        continue;
      }

      const normalized = entry.fileName.replace(/\\/g, "/");
      const lower = normalized.toLowerCase();
      const extension = extensionOf(lower);
      const baseName = lower.split("/").pop() ?? lower;

      if (
        baseName === "package.json" &&
        textBytesScanned < MAX_TEXT_SCAN_BYTES
      ) {
        const text = await readEntryText(
          zipfile,
          entry,
          Math.min(
            MAX_ENTRY_TEXT_BYTES,
            MAX_TEXT_SCAN_BYTES - textBytesScanned,
          ),
        );

        if (text !== null) {
          textBytesScanned += Buffer.byteLength(text);
          inspectPackageJson(text, normalized, findings);
        }
      } else if (
        TEXT_EXTENSIONS.has(extension) &&
        entry.uncompressedSize <= MAX_ENTRY_TEXT_BYTES &&
        textBytesScanned < MAX_TEXT_SCAN_BYTES
      ) {
        const text = await readEntryText(
          zipfile,
          entry,
          Math.min(
            MAX_ENTRY_TEXT_BYTES,
            MAX_TEXT_SCAN_BYTES - textBytesScanned,
          ),
        );

        if (text !== null) {
          textBytesScanned += Buffer.byteLength(text);
          inspectTextContent(text, normalized, findings);
        }
      }
    }
  } finally {
    zipfile.close();
  }

  const ratio = uncompressedBytes / Math.max(1, bytes.byteLength);

  if (
    uncompressedBytes > MAX_ARCHIVE_UNCOMPRESSED_BYTES ||
    ratio > MAX_ARCHIVE_COMPRESSION_RATIO
  ) {
    finding(
      findings,
      "block",
      "archive_bomb",
      "Archive looks like a zip bomb or expands too far.",
    );
  }

  if (entryCount === 0) {
    finding(findings, "block", "empty_archive", "Archive contains no entries.");
  }

  metadata.entryCount = entryCount;
  metadata.uncompressedBytes = uncompressedBytes;
  metadata.compressionRatio = Number(ratio.toFixed(2));
  metadata.textBytesScanned = textBytesScanned;
}

async function inspectPdf(
  bytes: Uint8Array,
  findings: UploadFinding[],
  metadata: Record<string, unknown>,
): Promise<void> {
  const buffer = Buffer.from(bytes);
  const hasBytes = (needle: string) =>
    buffer.includes(Buffer.from(needle, "latin1"));
  const dangerousMarkers: Array<{
    marker: string;
    code: string;
    message: string;
  }> = [
    {
      marker: "/JavaScript",
      code: "pdf_javascript",
      message: "PDF contains JavaScript.",
    },
    {
      marker: "/Launch",
      code: "pdf_launch_action",
      message: "PDF contains a launch action.",
    },
    {
      marker: "/EmbeddedFile",
      code: "pdf_embedded_file",
      message: "PDF contains an embedded file.",
    },
    {
      marker: "/RichMedia",
      code: "pdf_rich_media",
      message: "PDF contains rich media content.",
    },
    {
      marker: "/Encrypt",
      code: "pdf_encrypted",
      message: "PDF is encrypted.",
    },
  ];

  for (const item of dangerousMarkers) {
    if (hasBytes(item.marker)) {
      finding(findings, "block", item.code, item.message);
    }
  }

  for (const item of [
    {
      marker: "/OpenAction",
      code: "pdf_open_action",
      message: "PDF has an automatic open action.",
    },
    {
      marker: "/AA",
      code: "pdf_additional_action",
      message: "PDF has additional automatic actions.",
    },
    {
      marker: "/XFA",
      code: "pdf_xfa",
      message: "PDF contains an XFA form.",
    },
  ]) {
    if (hasBytes(item.marker)) {
      finding(findings, "warn", item.code, item.message);
    }
  }

  if (hasBytes("/JS")) {
    finding(
      findings,
      "warn",
      "pdf_js_name",
      "PDF references a JavaScript name object.",
    );
  }

  try {
    const document = await PDFDocument.load(bytes, {
      updateMetadata: false,
      throwOnInvalidObject: false,
    });

    metadata.pdfPageCount = document.getPageCount();
    metadata.pdfEncrypted = document.isEncrypted;

    if (document.isEncrypted) {
      finding(findings, "block", "pdf_encrypted", "PDF is encrypted.");
    }
  } catch (error) {
    finding(
      findings,
      "warn",
      "pdf_parse_failed",
      `PDF could not be fully parsed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }
}

function inspectText(
  bytes: Uint8Array,
  findings: UploadFinding[],
  metadata: Record<string, unknown>,
): void {
  const truncated = bytes.byteLength > MAX_TEXT_SCAN_BYTES;
  const sample = truncated ? bytes.subarray(0, MAX_TEXT_SCAN_BYTES) : bytes;
  const text = new TextDecoder("utf-8", { fatal: !truncated }).decode(sample);

  metadata.lineCount = text.split(/\r?\n/).length;
  metadata.textBytesScanned = sample.byteLength;
  metadata.textScanTruncated = truncated;

  if (truncated) {
    finding(
      findings,
      "warn",
      "text_scan_truncated",
      "Text file is larger than the 2 MB content-scan limit; review the rest manually.",
    );
  }

  inspectTextContent(text, "document", findings);
}

export async function analyzeUpload(input: {
  bytes: Uint8Array;
  fileName: string;
  detected: DetectedUpload;
}): Promise<UploadScanReport> {
  const findings: UploadFinding[] = [];
  const metadata: Record<string, unknown> = {
    fileName: input.fileName,
  };

  let status: UploadScanStatus = "CLEAN";

  const lowerName = input.fileName.toLowerCase();
  const outerExtension = extensionOf(lowerName);
  const outerBase = lowerName.split(/[\\/]/).pop() ?? lowerName;
  const previousExtension =
    outerExtension && outerBase.includes(".")
      ? extensionOf(outerBase.slice(0, -outerExtension.length - 1))
      : "";

  if (BLOCKED_EXTENSIONS.has(previousExtension)) {
    finding(
      findings,
      "warn",
      "double_extension",
      `File name uses a double extension (.${previousExtension}.${outerExtension}).`,
      input.fileName,
    );
  }

  if (/[\u202a-\u202e\u2066-\u2069]/.test(input.fileName)) {
    finding(
      findings,
      "warn",
      "bidi_control_characters",
      "File name contains bidirectional control characters.",
      input.fileName,
    );
  }

  try {
    if (input.detected.kind === "zip") {
      await inspectZip(input.bytes, findings, metadata);
    } else if (input.detected.kind === "pdf") {
      await inspectPdf(input.bytes, findings, metadata);
    } else {
      inspectText(input.bytes, findings, metadata);
    }

    if (findings.some((item) => item.severity === "block")) {
      status = "BLOCKED";
    } else if (findings.some((item) => item.severity === "warn")) {
      status = "SUSPICIOUS";
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    const unsafeEntryName =
      /invalid relative path|absolute path|invalid characters/i.test(message);

    status = unsafeEntryName ? "BLOCKED" : "ERROR";
    finding(
      findings,
      "block",
      unsafeEntryName ? "path_traversal" : "analysis_failed",
      unsafeEntryName
        ? "Archive contains an unsafe or traversal entry name."
        : `The file could not be analyzed safely: ${message}`,
    );
  }

  return {
    status,
    scannedAt: new Date().toISOString(),
    kind: input.detected.kind,
    extension: input.detected.extension,
    sizeBytes: input.bytes.byteLength,
    sha256: sha256(input.bytes),
    findings,
    metadata,
  };
}

export function canApproveScanStatus(status: UploadScanStatus): boolean {
  return status === "CLEAN" || status === "SUSPICIOUS";
}

export function isBlockedScanStatus(status: UploadScanStatus): boolean {
  return status === "BLOCKED" || status === "ERROR";
}
