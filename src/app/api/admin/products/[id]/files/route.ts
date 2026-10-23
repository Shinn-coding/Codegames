import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { saveProductFile } from "@/lib/admin-products";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, hashClientIp, isSameOriginRequest } from "@/lib/request";
import {
  MAX_UPLOAD_BYTES,
  detectUpload,
  sanitizeUploadFileName,
} from "@/lib/upload-core";

export const runtime = "nodejs";

const RATE_LIMIT_PER_MINUTE = 60;
const MULTIPART_OVERHEAD_BYTES = 1024 * 1024;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const ID_PATTERN = /^[a-z0-9]{16,40}$/;

function json(
  body: Record<string, unknown>,
  init?: { status?: number; headers?: HeadersInit },
) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: { "Cache-Control": "no-store", ...init?.headers },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return json({ error: "Unauthorized." }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return json({ error: "Forbidden." }, { status: 403 });
  }

  if (!isSameOriginRequest(request)) {
    return json({ error: "Invalid request origin." }, { status: 403 });
  }

  const limit = await checkRateLimit({
    key: `admin-upload:${session.user.id}`,
    limit: RATE_LIMIT_PER_MINUTE,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return json(
      { error: "Too many uploads. Try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.max(
              1,
              Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000),
            ),
          ),
        },
      },
    );
  }

  const { id } = await params;

  if (!ID_PATTERN.test(id)) {
    return json({ error: "Product not found." }, { status: 404 });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");

  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_UPLOAD_BYTES + MULTIPART_OVERHEAD_BYTES
  ) {
    return json(
      { error: "The file is larger than the 50 MB limit." },
      { status: 413 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Invalid upload payload." }, { status: 400 });
  }

  const file = form.get("file");

  if (!file || typeof file === "string") {
    return json({ error: "Choose a file to upload." }, { status: 400 });
  }

  if (file.size === 0) {
    return json({ error: "The file is empty." }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return json(
      { error: "The file is larger than the 50 MB limit." },
      { status: 413 },
    );
  }

  const version = String(form.get("version") ?? "").trim();

  if (!VERSION_PATTERN.test(version)) {
    return json(
      { error: "Use a version such as 1.2.0 before uploading." },
      { status: 400 },
    );
  }

  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });

  if (!product) {
    return json({ error: "Product not found." }, { status: 404 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectUpload(bytes, file.name);

  if (!detected) {
    return json(
      {
        error:
          "Only ZIP, PDF, TXT, or MD files are accepted, and the bytes must match the extension.",
      },
      { status: 415 },
    );
  }

  try {
    const saved = await saveProductFile({
      product,
      version,
      fileName: sanitizeUploadFileName(file.name),
      extension: detected.extension,
      mimeType: detected.mimeType,
      bytes,
      actorId: session.user.id,
      ipHash: hashClientIp(getClientIp(request)),
    });

    return json(
      {
        ok: true,
        file: {
          id: saved.id,
          version: saved.version,
          fileName: saved.fileName,
          sizeBytes: saved.sizeBytes,
          isCurrent: saved.isCurrent,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "[admin] Could not store the product file.",
      error instanceof Error ? error.message : "unknown error",
    );

    return json(
      { error: "The file could not be stored. Try again." },
      { status: 500 },
    );
  }
}
