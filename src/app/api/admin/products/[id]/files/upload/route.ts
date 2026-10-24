import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSameOriginRequest } from "@/lib/request";
import {
  MAX_UPLOAD_BYTES,
  PRODUCT_ID_PATTERN,
  PRODUCT_VERSION_PATTERN,
  validateProductUploadTarget,
} from "@/lib/upload-core";

export const runtime = "nodejs";

const RATE_LIMIT_PER_MINUTE = 60;

const payloadSchema = z.object({
  version: z.string().regex(PRODUCT_VERSION_PATTERN),
  fileName: z.string().min(1).max(255),
});

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

  const { id } = await params;

  if (!PRODUCT_ID_PATTERN.test(id)) {
    return json({ error: "Product not found." }, { status: 404 });
  }

  if (env.STORAGE_DRIVER !== "vercel-blob" || !env.BLOB_READ_WRITE_TOKEN) {
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

  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });

  if (!product) {
    return json({ error: "Product not found." }, { status: 404 });
  }

  let body: HandleUploadBody;

  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return json({ error: "Invalid upload payload." }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      token: env.BLOB_READ_WRITE_TOKEN,
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let payload: unknown;

        try {
          payload = JSON.parse(clientPayload ?? "");
        } catch {
          throw new Error("Invalid upload metadata.");
        }

        const parsed = payloadSchema.safeParse(payload);

        if (!parsed.success) {
          throw new Error("Invalid upload metadata.");
        }

        const target = validateProductUploadTarget({
          pathname,
          slug: product.slug,
          version: parsed.data.version,
          fileName: parsed.data.fileName,
        });

        if (!target) {
          throw new Error("Invalid upload target.");
        }

        return {
          addRandomSuffix: false,
          allowOverwrite: false,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          tokenPayload: JSON.stringify({
            productId: product.id,
            version: parsed.data.version,
            fileName: target.fileName,
          }),
        };
      },
    });

    return json(result);
  } catch (error) {
    console.error(
      "[admin] Could not authorize the Blob upload.",
      error instanceof Error ? error.message : "unknown error",
    );

    return json(
      { error: "The upload could not be authorized." },
      { status: 400 },
    );
  }
}
