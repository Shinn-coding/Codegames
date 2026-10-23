import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ActivationLimitError,
  LicenseInactiveError,
  LicenseNotFoundError,
  activateLicense,
} from "@/lib/licenses";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, hashClientIp } from "@/lib/request";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 8 * 1024;
const RATE_LIMIT_PER_MINUTE = 10;

const activationSchema = z.object({
  licenseKey: z.string().trim().min(1).max(128),
  instanceId: z
    .string()
    .trim()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/, "Invalid instance ID."),
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

function hashUserAgent(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

export async function POST(request: Request) {
  const limit = await checkRateLimit({
    key: `license-activate:${hashClientIp(getClientIp(request))}`,
    limit: RATE_LIMIT_PER_MINUTE,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return json(
      { error: "Too many activation requests." },
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
    return json({ error: "Activation body is too large." }, { status: 413 });
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return json({ error: "Activation body is too large." }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = activationSchema.safeParse(payload);
  if (!parsed.success) {
    return json({ error: "Invalid activation request." }, { status: 400 });
  }

  try {
    const result = await activateLicense({
      licenseKey: parsed.data.licenseKey,
      instanceId: parsed.data.instanceId,
      ipHash: hashClientIp(getClientIp(request)),
      userAgentHash: hashUserAgent(request.headers.get("user-agent")),
    });

    return json({
      ok: true,
      activated: true,
      alreadyActive: result.alreadyActive,
      license: {
        id: result.license.id,
        type: result.license.type,
        status: result.license.status,
        activationCount: result.license.activationCount,
        maxActivations: result.license.maxActivations,
        issuedAt: result.license.issuedAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof LicenseNotFoundError) {
      return json({ error: "License key not found." }, { status: 404 });
    }

    if (error instanceof LicenseInactiveError) {
      return json({ error: "License is not active." }, { status: 403 });
    }

    if (error instanceof ActivationLimitError) {
      return json(
        { error: "License activation limit reached." },
        { status: 409 },
      );
    }

    console.error(
      "[license] Could not activate license.",
      error instanceof Error ? error.message : "unknown error",
    );
    return json({ error: "Activation failed." }, { status: 500 });
  }
}
