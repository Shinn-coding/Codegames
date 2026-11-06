import { prisma } from "@/lib/db";

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

const RATE_LIMIT_RETENTION_MS = 24 * 60 * 60 * 1_000;
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 60 * 60 * 1_000;
let lastCleanupAt = 0;

async function cleanupExpiredWindows(now: number): Promise<void> {
  if (now - lastCleanupAt < RATE_LIMIT_CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanupAt = now;

  await prisma.rateLimit
    .deleteMany({
      where: { windowStart: { lt: new Date(now - RATE_LIMIT_RETENTION_MS) } },
    })
    .catch(() => undefined);
}

/**
 * Fixed-window rate limit backed by Postgres.
 *
 * The upsert is atomic, so concurrent requests cannot bypass the counter.
 * Use a stable key such as `login:${ip}` or `checkout:${userId}`.
 */
export async function checkRateLimit({
  key,
  limit,
  windowMs,
}: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);

  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "RateLimit" ("key", "windowStart", "count")
    VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT ("key", "windowStart")
    DO UPDATE SET "count" = "RateLimit"."count" + 1
    RETURNING "count"
  `;

  const count = Number(rows[0]?.count ?? 1);

  await cleanupExpiredWindows(now);

  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt: new Date(windowStart.getTime() + windowMs),
  };
}
