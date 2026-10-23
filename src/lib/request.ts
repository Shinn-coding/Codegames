import { createHash } from "node:crypto";

import { env } from "@/lib/env";

/**
 * Browser POSTs include an Origin header. Reject obvious cross-site requests
 * as defence in depth; the session cookie and SameSite policy remain the
 * primary protection.
 */
export function isSameOriginRequest(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  try {
    const allowed = new Set([
      new URL(env.NEXT_PUBLIC_APP_URL).origin,
      new URL(request.url).origin,
    ]);
    return allowed.has(new URL(origin).origin);
  } catch {
    return false;
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function hashClientIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}
