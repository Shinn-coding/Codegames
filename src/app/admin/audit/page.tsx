import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth-guards";
import { listAuditLogs } from "@/lib/audit";
import { formatDateTime } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/app/page-header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Audit log",
  robots: { index: false, follow: false },
};

export default async function AdminAuditPage() {
  await requireAdmin();
  const entries = await listAuditLogs(100);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Accountability"
        title="Audit log"
        description="The last 100 admin mutations. Metadata is intentionally short and never includes license keys or download tokens."
      />

      {entries.length === 0 ? (
        <EmptyState
          title="No admin actions yet"
          description="Publish a product or change a setting and the action will appear here with the actor and timestamp."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="hidden grid-cols-[170px_minmax(0,1fr)_minmax(0,1.2fr)_160px] gap-3 border-b border-line bg-bg/50 px-5 py-3 text-[9px] font-semibold tracking-[0.16em] text-muted uppercase lg:grid">
            <span>Action</span>
            <span>Actor</span>
            <span>Metadata</span>
            <span className="text-right">When</span>
          </div>
          <ul className="divide-y divide-line">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="grid gap-2 px-5 py-4 lg:grid-cols-[170px_minmax(0,1fr)_minmax(0,1.2fr)_160px] lg:items-center lg:gap-3"
              >
                <div>
                  <p className="font-mono text-[11px] font-medium text-ink">
                    {entry.action}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {entry.entity}
                    {entry.entityId ? ` · ${entry.entityId.slice(-8)}` : ""}
                  </p>
                </div>
                <p className="truncate text-[11px] text-ink/75">
                  {entry.actor?.email ?? "system"}
                </p>
                <p className="truncate font-mono text-[10px] text-muted">
                  {entry.meta ? JSON.stringify(entry.meta) : "—"}
                </p>
                <p className="text-[11px] text-muted lg:text-right">
                  {formatDateTime(entry.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
