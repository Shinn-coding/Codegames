import { NextResponse, type NextRequest } from "next/server";

import { handlers } from "@/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, hashClientIp } from "@/lib/request";

export const runtime = "nodejs";

// Reads include session polling and OAuth callbacks. Writes cover sign-in and
// sign-out, so they get the stricter credential-stuffing budget.
const AUTH_READ_LIMIT_PER_MINUTE = 120;
const AUTH_WRITE_LIMIT_PER_MINUTE = 20;

async function enforceRateLimit(
  request: NextRequest,
  method: "get" | "post",
  limit: number,
): Promise<Response | null> {
  const result = await checkRateLimit({
    key: `auth:${method}:${hashClientIp(getClientIp(request))}`,
    limit,
    windowMs: 60_000,
  });

  if (result.allowed) {
    return null;
  }

  return NextResponse.json(
    { error: "Too many authentication requests. Try again shortly." },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(
          Math.max(
            1,
            Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
          ),
        ),
      },
    },
  );
}

export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(
    request,
    "get",
    AUTH_READ_LIMIT_PER_MINUTE,
  );

  return limited ?? handlers.GET(request);
}

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(
    request,
    "post",
    AUTH_WRITE_LIMIT_PER_MINUTE,
  );

  return limited ?? handlers.POST(request);
}
