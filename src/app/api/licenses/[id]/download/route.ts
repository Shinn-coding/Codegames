import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  DownloadFileNotFoundError,
  DownloadLicenseNotFoundError,
  DownloadUnavailableError,
  createDownloadLink,
} from "@/lib/downloads";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSameOriginRequest } from "@/lib/request";

export const runtime = "nodejs";

const RATE_LIMIT_PER_MINUTE = 10;

function json(
  body: Record<string, unknown>,
  init?: { status?: number; headers?: HeadersInit },
) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: {
      "Cache-Control": "no-store",
      ...init?.headers,
    },
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

  if (!isSameOriginRequest(request)) {
    return json({ error: "Invalid request origin." }, { status: 403 });
  }

  const limit = await checkRateLimit({
    key: `license-download:${session.user.id}`,
    limit: RATE_LIMIT_PER_MINUTE,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return json(
      { error: "Too many download requests." },
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

  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    return json({ error: "License not found." }, { status: 404 });
  }

  try {
    const link = await createDownloadLink({
      licenseId: id,
      userId: session.user.id,
    });

    return json({
      ok: true,
      url: link.url,
      fileName: link.fileName,
      sizeBytes: link.sizeBytes,
      expiresAt: link.expiresAt.toISOString(),
      maxUses: link.maxUses,
    });
  } catch (error) {
    if (error instanceof DownloadLicenseNotFoundError) {
      return json({ error: "License not found." }, { status: 404 });
    }

    if (error instanceof DownloadUnavailableError) {
      return json(
        { error: "This license is not available for download." },
        { status: 403 },
      );
    }

    if (error instanceof DownloadFileNotFoundError) {
      return json(
        { error: "No downloadable file is available for this product." },
        { status: 404 },
      );
    }

    console.error(
      "[download] Could not create a download link.",
      error instanceof Error ? error.message : "unknown error",
    );
    return json({ error: "Could not prepare the download." }, { status: 500 });
  }
}
