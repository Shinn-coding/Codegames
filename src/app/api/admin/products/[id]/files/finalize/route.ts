import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { saveProductFileFromStorage } from "@/lib/admin-products";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, hashClientIp, isSameOriginRequest } from "@/lib/request";
import { getStorage } from "@/lib/storage";
import {
  MAX_UPLOAD_BYTES,
  PRODUCT_ID_PATTERN,
  PRODUCT_VERSION_PATTERN,
  detectUpload,
  validateProductUploadTarget,
} from "@/lib/upload-core";

export const runtime = "nodejs";

const RATE_LIMIT_PER_MINUTE = 60;

const bodySchema = z.object({
  pathname: z.string().min(1).max(1024),
  version: z.string().regex(PRODUCT_VERSION_PATTERN),
  fileName: z.string().min(1).max(255),
});

class UploadTooLargeError extends Error {}
class EmptyUploadError extends Error {}

function json(
  body: Record<string, unknown>,
  init?: { status?: number; headers?: HeadersInit },
) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: { "Cache-Control": "no-store", ...init?.headers },
  });
}

async function readLimited(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      total += value.byteLength;

      if (total > MAX_UPLOAD_BYTES) {
        await reader.cancel();
        throw new UploadTooLargeError();
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  if (total === 0) {
    throw new EmptyUploadError();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return bytes;
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

  const { id } = await params;

  if (!PRODUCT_ID_PATTERN.test(id)) {
    return json({ error: "Product not found." }, { status: 404 });
  }

  if (env.STORAGE_DRIVER !== "vercel-blob") {
    return json({ error: "Blob uploads are not enabled." }, { status: 400 });
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

  let body: z.infer<typeof bodySchema>;

  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return json({ error: "Invalid upload payload." }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });

  if (!product) {
    return json({ error: "Product not found." }, { status: 404 });
  }

  const target = validateProductUploadTarget({
    pathname: body.pathname,
    slug: product.slug,
    version: body.version,
    fileName: body.fileName,
  });

  if (!target) {
    return json({ error: "Invalid upload target." }, { status: 400 });
  }

  const storage = getStorage();
  let stream: ReadableStream<Uint8Array>;

  try {
    stream = await storage.getStream(body.pathname);
  } catch (error) {
    console.error(
      "[admin] Could not read the uploaded Blob.",
      error instanceof Error ? error.message : "unknown error",
    );

    return json(
      { error: "The uploaded file could not be read." },
      { status: 404 },
    );
  }

  let bytes: Uint8Array;

  try {
    bytes = await readLimited(stream);
  } catch (error) {
    if (
      error instanceof UploadTooLargeError ||
      error instanceof EmptyUploadError
    ) {
      const tooLarge = error instanceof UploadTooLargeError;

      await storage.delete(body.pathname).catch(() => undefined);

      return json(
        {
          error: tooLarge
            ? "The file is larger than the 50 MB limit."
            : "The file is empty.",
        },
        { status: tooLarge ? 413 : 400 },
      );
    }

    console.error(
      "[admin] Could not read uploaded Blob bytes.",
      error instanceof Error ? error.message : "unknown error",
    );

    return json(
      { error: "The uploaded file could not be read." },
      { status: 500 },
    );
  }

  const detected = detectUpload(bytes, target.fileName);

  if (!detected) {
    await storage.delete(body.pathname).catch(() => undefined);

    return json(
      {
        error:
          "Only ZIP, PDF, TXT, or MD files are accepted, and the bytes must match the extension.",
      },
      { status: 415 },
    );
  }

  const checksumSha256 = createHash("sha256").update(bytes).digest("hex");

  try {
    const saved = await saveProductFileFromStorage({
      product,
      version: body.version,
      storageKey: body.pathname,
      fileName: target.fileName,
      mimeType: detected.mimeType,
      sizeBytes: bytes.byteLength,
      checksumSha256,
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
      "[admin] Could not record the uploaded product file.",
      error instanceof Error ? error.message : "unknown error",
    );

    return json(
      { error: "The file could not be stored. Try again." },
      { status: 500 },
    );
  }
}
