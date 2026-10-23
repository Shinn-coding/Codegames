import { NextResponse } from "next/server";

import { contentDispositionAttachment } from "@/lib/download-core";
import {
  DownloadFileNotFoundError,
  DownloadTokenExhaustedError,
  DownloadTokenExpiredError,
  DownloadTokenNotFoundError,
  DownloadTokenUnavailableError,
  DownloadUnavailableError,
  consumeDownloadToken,
} from "@/lib/downloads";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, hashClientIp } from "@/lib/request";

export const runtime = "nodejs";

const RATE_LIMIT_PER_MINUTE = 30;

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const ipHash = hashClientIp(getClientIp(request));
  const limit = await checkRateLimit({
    key: `download-token:${ipHash}`,
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

  const { token } = await params;

  try {
    const delivery = await consumeDownloadToken({
      token,
      ipHash,
      userAgent: request.headers.get("user-agent"),
    });

    return new NextResponse(delivery.stream, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": contentDispositionAttachment(delivery.fileName),
        "Content-Length": String(delivery.sizeBytes),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof DownloadTokenNotFoundError) {
      return json({ error: "Download link not found." }, { status: 404 });
    }

    if (error instanceof DownloadTokenExpiredError) {
      return json({ error: "Download link has expired." }, { status: 410 });
    }

    if (error instanceof DownloadTokenExhaustedError) {
      return json(
        { error: "Download link has reached its usage limit." },
        { status: 410 },
      );
    }

    if (error instanceof DownloadTokenUnavailableError) {
      return json(
        { error: "Download link is no longer available." },
        { status: 410 },
      );
    }

    if (error instanceof DownloadUnavailableError) {
      return json(
        { error: "This license is not available for download." },
        { status: 403 },
      );
    }

    if (error instanceof DownloadFileNotFoundError) {
      return json(
        { error: "The product file is not available." },
        { status: 404 },
      );
    }

    console.error(
      "[download] Could not deliver the product file.",
      error instanceof Error ? error.message : "unknown error",
    );
    return json({ error: "Download failed." }, { status: 500 });
  }
}
