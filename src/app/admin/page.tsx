import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus, SlidersHorizontal } from "@phosphor-icons/react/ssr";

import { requireAdmin } from "@/lib/auth-guards";
import { getAdminOverview } from "@/lib/admin-overview";
import { formatDateTime, formatIdr } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import {
  PageHeader,
  SectionHeading,
  StatCard,
} from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin overview",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const user = await requireAdmin();
  const data = await getAdminOverview();

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Admin console"
        title="Store control room."
        description={`Signed in as ${user.email}. Prices, publishing, licenses, and landing copy are all editable here.`}
        actions={
          <>
            <ButtonLink href="/admin/products/new" variant="primary" size="md">
              <Plus size={15} weight="bold" aria-hidden="true" />
              New product
            </ButtonLink>
            <ButtonLink href="/admin/settings" variant="outline" size="md">
              <SlidersHorizontal size={15} aria-hidden="true" />
              Settings
            </ButtonLink>
          </>
        }
      />

      <section aria-label="Store summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatIdr(data.revenueIdr)}
          mono
          hint={`${data.paidOrderCount} paid orders`}
        />
        <StatCard
          label="Orders"
          value={data.orderCount}
          hint={`${data.pendingOrderCount} pending`}
        />
        <StatCard
          label="Licenses"
          value={data.licenseCount}
          hint={`${data.activeLicenseCount} active`}
        />
        <StatCard
          label="Products"
          value={data.productCount}
          hint={`${data.availableProductCount} available`}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section aria-labelledby="admin-recent-orders" className="space-y-4">
          <SectionHeading
            id="admin-recent-orders"
            title="Recent orders"
            description="Newest checkouts across every status."
            action={
              <Link
                href="/admin/orders"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-forest hover:text-ink"
              >
                All orders
                <ArrowRight size={12} weight="bold" aria-hidden="true" />
              </Link>
            }
          />

          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_120px_110px] gap-3 border-b border-line bg-bg/50 px-5 py-3 text-[9px] font-semibold tracking-[0.16em] text-muted uppercase sm:grid">
              <span>Order</span>
              <span>Customer</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Status</span>
            </div>
            {data.recentOrders.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">No orders yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {data.recentOrders.map((order) => (
                  <li
                    key={order.id}
                    className="grid gap-2 px-5 py-3.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_120px_110px] sm:items-center sm:gap-3"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/orders?q=${encodeURIComponent(order.orderNumber)}`}
                        className="font-mono text-[11px] font-medium text-ink hover:text-forest"
                      >
                        {order.orderNumber}
                      </Link>
                      <p className="mt-0.5 truncate text-[11px] text-muted">
                        {order.product.name}
                      </p>
                    </div>
                    <p className="truncate text-[11px] text-muted">{order.email}</p>
                    <p className="font-mono text-[11px] text-ink sm:text-right">
                      {formatIdr(order.amountIdr)}
                    </p>
                    <div className="sm:flex sm:justify-end">
                      <StatusBadge status={order.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section aria-labelledby="admin-recent-audit" className="space-y-4">
          <SectionHeading
            id="admin-recent-audit"
            title="Admin activity"
            description="Every mutation is recorded."
            action={
              <Link
                href="/admin/audit"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-forest hover:text-ink"
              >
                Full log
                <ArrowRight size={12} weight="bold" aria-hidden="true" />
              </Link>
            }
          />

          <div className="rounded-2xl border border-line bg-surface p-5">
            {data.recentAudit.length === 0 ? (
              <p className="text-sm text-muted">No admin actions recorded yet.</p>
            ) : (
              <ol className="space-y-4">
                {data.recentAudit.map((entry) => (
                  <li key={entry.id} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-mint"
                    />
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-ink">
                        {entry.action}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-muted">
                        {entry.actor?.email ?? "system"} ·{" "}
                        {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-forest p-5 text-bg">
            <p className="text-[9px] font-semibold tracking-[0.18em] text-bg/40 uppercase">
              Last 7 days
            </p>
            <p className="mt-2 font-mono text-[28px] leading-none">
              {data.downloadCount}
            </p>
            <p className="mt-1.5 text-[11px] text-bg/55">
              successful protected downloads
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="dark">{data.availableProductCount} live products</Badge>
              <Badge tone="dark">{data.activeLicenseCount} active</Badge>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
