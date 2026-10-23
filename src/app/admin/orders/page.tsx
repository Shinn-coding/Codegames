import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth-guards";
import { listAdminOrders } from "@/lib/admin-orders";
import { formatDate, formatIdr } from "@/lib/format";
import { parseOrderStatus, parsePage, parseSearchQuery } from "@/lib/status-values";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { Pagination, StatusBadge } from "@/components/app/status-badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Orders",
  robots: { index: false, follow: false },
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const status = parseOrderStatus(query.status);
  const q = parseSearchQuery(query.q);
  const page = parsePage(query.page);

  const result = await listAdminOrders({ status, q, page });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Transactions"
        title="Orders"
        description={`${result.total} order${result.total === 1 ? "" : "s"} matching this view. Payment state is authoritative from the provider.`}
      />

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
            placeholder="Order number, email, or product"
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
            {["PENDING", "PAID", "EXPIRED", "FAILED", "REFUNDED"].map((value) => (
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
            href="/admin/orders"
            className="text-[11px] font-semibold text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            Reset
          </Link>
        ) : null}
      </form>

      {result.rows.length === 0 ? (
        <EmptyState
          title="No orders in this view"
          description="Clear the filters or wait for the first checkout. Mock payments appear here just like real settlements."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_110px_100px] gap-3 border-b border-line bg-bg/50 px-5 py-3 text-[9px] font-semibold tracking-[0.16em] text-muted uppercase lg:grid">
            <span>Order</span>
            <span>Customer</span>
            <span>Product</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Status</span>
          </div>
          <ul className="divide-y divide-line">
            {result.rows.map((order) => (
              <li
                key={order.id}
                className="grid gap-2 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_110px_100px] lg:items-center lg:gap-3"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[11px] font-medium text-ink">
                    {order.orderNumber}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {formatDate(order.createdAt)} · {order.provider}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[11px] text-ink">
                    {order.email}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-muted">
                    {order.user?.email ?? "no account"}
                  </p>
                </div>
                <p className="truncate text-[11px] text-muted">
                  {order.product.name}
                </p>
                <p className="font-mono text-[11px] text-ink lg:text-right">
                  {formatIdr(order.amountIdr)}
                </p>
                <div className="lg:flex lg:justify-end">
                  <StatusBadge status={order.status} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Pagination
        basePath="/admin/orders"
        page={result.page}
        pageCount={result.pageCount}
        params={{ status, q }}
      />
    </div>
  );
}
