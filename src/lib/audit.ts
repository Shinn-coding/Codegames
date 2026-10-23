import type { Prisma } from "@prisma/client";
import { headers } from "next/headers";

import { prisma } from "@/lib/db";
import { hashClientIp } from "@/lib/request";

export type AuditAction =
  | "product.create"
  | "product.update"
  | "product.status"
  | "product.file.upload"
  | "product.file.current"
  | "product.file.delete"
  | "settings.update"
  | "license.revoke"
  | "license.access_email";

export type AuditEntry = {
  actorId: string;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  meta?: Prisma.InputJsonValue;
  ipHash?: string;
};

/**
 * Resolve the caller's IP hash inside a Server Action. Audit rows never store a
 * raw address, only a truncated SHA-256 digest.
 */
export async function getRequestIpHash(): Promise<string | undefined> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || store.get("x-real-ip")?.trim();

  return ip ? hashClientIp(ip) : undefined;
}

/**
 * Audit writes must never break the operation they describe. A failed insert is
 * logged and swallowed so an admin action still completes.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        meta: entry.meta,
        ipHash: entry.ipHash,
      },
    });
  } catch (error) {
    console.error(
      "[audit] Could not write the audit entry.",
      error instanceof Error ? error.message : "unknown error",
    );
  }
}

export type AuditLogRow = Prisma.AuditLogGetPayload<{
  include: { actor: { select: { email: true; name: true } } };
}>;

export async function listAuditLogs(limit = 100): Promise<AuditLogRow[]> {
  return prisma.auditLog.findMany({
    include: { actor: { select: { email: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
