import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { consumeLicenseRevealCookie } from "@/lib/license-reveal";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSameOriginRequest } from "@/lib/request";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 2 * 1024;

const revealSchema = z.object({
  orderNumber: z.string().trim().min(1).max(64),
});

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

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isSameOriginRequest(request)) {
    return json({ error: "Invalid request origin." }, { status: 403 });
  }

  const limit = await checkRateLimit({
    key: `license-reveal:${session.user.id}`,
    limit: 20,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return json(
      { error: "Too many reveal requests." },
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

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ error: "Reveal body is too large." }, { status: 413 });
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return json({ error: "Reveal body is too large." }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = revealSchema.safeParse(payload);
  if (!parsed.success) {
    return json({ error: "Invalid reveal request." }, { status: 400 });
  }

  const licenseKey = await consumeLicenseRevealCookie({
    orderNumber: parsed.data.orderNumber,
    userId: session.user.id,
  });

  return json({ licenseKey });
}
