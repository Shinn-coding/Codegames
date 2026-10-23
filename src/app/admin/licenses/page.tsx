import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth-guards";
import { listAdminLicenses } from "@/lib/admin-licenses";
import { formatDate } from "@/lib/format";
import { maskLicenseKey } from "@/lib/license-core";
import {
  parseLicenseStatus,
  parsePage,
  parseSearchQuery,
} from "@/lib/status-values";
import { resendAccessAction, revokeLicenseAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { SubmitButton } from "@/components/admin/submit-button";
import { Pagination, StatusBadge } from "@/components/app/status-badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Licenses",
  robots: { index: false, follow: false },
};

export default async function AdminLicensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    page?: string;
    revoked?: string;
    resent?: string;
    error?: string;
  }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const status = parseLicenseStatus(query.status);
  const q = parseSearchQuery(query.q);
  const page = parsePage(query.page);

  const result = await listAdminLicenses({ status, q, page });

  const notice = query.error
    ? { tone: "error" as const, message: query.error }
    : query.revoked
      ? {
          tone: "success" as const,
          message: "License revoked and its download tokens expired.",
        }
      : query.resent
        ? {
            tone: "success" as const,
            message: "Access email sent with a fresh download link.",
          }
        : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Licensing"
        title="Licenses"
        description={`${result.total} license${result.total === 1 ? "" : "s"}. Raw keys are not recoverable — only a masked reference is stored.`}
      />

      {notice ? (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={
            notice.tone === "error"
              ? "rounded-xl border border-[#b4573a]/30 bg-[#b4573a]/10 px-4 py-3 text-[12px] leading-6 text-[#7d3a20]"
              : "rounded-xl border border-mint/40 bg-mint/15 px-4 py-3 text-[12px] leading-6 text-forest"
          }
        >
          {notice.message}
        </p>
      ) : null}

      <form
        method="get"
        className="flex flex-wrap items-end gap-2 rounded-2xl border border-line bg-surface p-4"
      >
        <label className="min-w-[200px] flex-1">
          <span className="text-[9px] font-semibold tracking-[0.16em] text-muted uppercase">
            Search
          </span>
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Order number, email, product, or key last 4"
            className="mt-1.5 h-10 w-full rounded-xl border border-line bg-bg/40 px-3 text-[12px] text-ink placeholder:text-muted/60 focus:border-forest/35 focus:outline-none"
          />
        </label>
        <label>
          <span className="text-[9px] font-semibold tracking-[0.16em] text-muted uppercase">
            Status
          </span>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="mt-1.5 h-10 rounded-xl border border-line bg-bg/40 px-3 text-[12px] text-ink focus:border-forest/35 focus:outline-none"
          >
            <option value="">All</option>
            {["ACTIVE", "REVOKED", "EXPIRED"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="primary" size="sm">
          Apply
        </Button>
        {status || q ? (
          <Link
            href="/admin/licenses"
            className="text-[11px] font-semibold text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            Reset
          </Link>
        ) : null}
      </form>

      {result.rows.length === 0 ? (
        <EmptyState
          title="No licenses in this view"
          description="A license is created automatically when an order settles. Try clearing the filters."
        />
      ) : (
        <ul className="space-y-3">
          {result.rows.map((license) => (
            <li
              key={license.id}
              className="rounded-2xl border border-line bg-surface p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold text-ink">
                      {license.product.name}
                    </p>
                    <StatusBadge status={license.status} />
                  </div>
                  <p className="mt-1.5 font-mono text-[12px] text-ink/80">
                    {maskLicenseKey(license)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    {license.order.email} ·{" "}
                    <span className="font-mono">
                      {license.order.orderNumber}
                    </span>{" "}
                    · issued {formatDate(license.issuedAt)}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-[9px] font-semibold tracking-[0.16em] text-muted uppercase">
                    Activations
                  </p>
                  <p className="mt-1 font-mono text-[12px] text-ink">
                    {license.activationCount} / {license.maxActivations}
                  </p>
                  <p className="mt-1 text-[10px] text-muted">
                    {license._count.downloadLogs} download
                    {license._count.downloadLogs === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                {license.status === "ACTIVE" ? (
                  <>
                    <form action={resendAccessAction}>
                      <input
                        type="hidden"
                        name="licenseId"
                        value={license.id}
                      />
                      <SubmitButton
                        label="Resend access"
                        pendingLabel="Sending…"
                        variant="outline"
                        size="sm"
                      />
                    </form>
                    <form action={revokeLicenseAction}>
                      <input
                        type="hidden"
                        name="licenseId"
                        value={license.id}
                      />
                      <SubmitButton
                        label="Revoke"
                        pendingLabel="Revoking…"
                        variant="ghost"
                        size="sm"
                        confirm={`Revoke ${maskLicenseKey(license)} and expire its download tokens?`}
                      />
                    </form>
                  </>
                ) : (
                  <p className="text-[10px] text-muted">
                    {license.status === "REVOKED"
                      ? "Revoked licenses cannot download or activate."
                      : "Expired licenses cannot download or activate."}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        basePath="/admin/licenses"
        page={result.page}
        pageCount={result.pageCount}
        params={{ status, q }}
      />
    </div>
  );
}
