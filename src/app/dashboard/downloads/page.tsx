import type { Metadata } from "next";
import { DownloadSimple } from "@phosphor-icons/react/ssr";

import { requireUser } from "@/lib/auth-guards";
import { listDownloadsForUser } from "@/lib/dashboard";
import { formatDateTime } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/app/page-header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Downloads",
  robots: { index: false, follow: false },
};

export default async function DashboardDownloadsPage() {
  const user = await requireUser();
  const downloads = await listDownloadsForUser(user.id);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Delivery"
        title="Download history"
        description="Each row is one successful use of a private download token. Raw tokens and IP addresses are never stored in readable form."
        actions={
          <ButtonLink href="/dashboard/licenses" variant="outline" size="md">
            Go to licenses
          </ButtonLink>
        }
      />

      {downloads.length === 0 ? (
        <EmptyState
          title="Nothing downloaded yet"
          description="Open a license and generate a private link. Links expire after 30 minutes and allow two downloads."
          action={
            <ButtonLink href="/dashboard/licenses" variant="primary" size="md">
              Open licenses
            </ButtonLink>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="hidden grid-cols-[minmax(0,1fr)_190px_150px] gap-4 border-b border-line bg-bg/50 px-5 py-3 text-[9px] font-semibold tracking-[0.16em] text-muted uppercase sm:grid">
            <span>Product</span>
            <span>Delivery</span>
            <span className="text-right">When</span>
          </div>
          <ul className="divide-y divide-line">
            {downloads.map((log) => (
              <li
                key={log.id}
                className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_190px_150px] sm:items-center sm:gap-4"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-mint/25 text-forest">
                    <DownloadSimple size={14} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink">
                      {log.license.product.name}
                    </p>
                    <p className="font-mono text-[10px] text-muted">
                      GABUT-••••-••••-••••-{log.license.keyLast4}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-muted">Private link</p>
                <p className="text-[11px] text-muted sm:text-right">
                  {formatDateTime(log.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
