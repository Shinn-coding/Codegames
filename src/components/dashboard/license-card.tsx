import Link from "next/link";
import { ArrowUpRight, DownloadSimple } from "@phosphor-icons/react/ssr";

import type { DashboardLicense } from "@/lib/dashboard";
import { formatDate } from "@/lib/format";
import { maskLicenseKey } from "@/lib/license-core";
import { LicenseDownload } from "@/components/checkout/license-download";
import { StatusBadge } from "@/components/app/status-badge";

export function LicenseCard({
  license,
  showDownload = true,
}: {
  license: DashboardLicense;
  showDownload?: boolean;
}) {
  const active = license.status === "ACTIVE";

  return (
    <article className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink">
              {license.product.name}
            </p>
            <StatusBadge status={license.status} />
          </div>
          <p className="mt-2 font-mono text-[12px] tracking-tight text-ink/80">
            {maskLicenseKey(license)}
          </p>
          <p className="mt-1.5 text-[11px] text-muted">
            v{license.product.version} · {license.type} license · issued{" "}
            {formatDate(license.issuedAt)}
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

      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line pt-4 text-[11px]">
        <Link
          href={`/checkout/success?order=${encodeURIComponent(
            license.order.orderNumber,
          )}`}
          className="inline-flex items-center gap-1 font-semibold text-muted transition-colors hover:text-ink"
        >
          <ArrowUpRight size={12} weight="bold" aria-hidden="true" />
          Receipt {license.order.orderNumber}
        </Link>
        <span className="inline-flex items-center gap-1.5 text-muted">
          <DownloadSimple size={12} aria-hidden="true" />
          {active
            ? "Private link, 30 min, 2 uses"
            : "Download unavailable"}
        </span>
      </div>

      {active && showDownload ? (
        <div className="mt-4 [&>div]:mt-0">
          <LicenseDownload licenseId={license.id} />
        </div>
      ) : null}
    </article>
  );
}
