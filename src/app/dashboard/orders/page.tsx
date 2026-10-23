import type { Metadata } from "next";
import Link from "next/link";

import { requireUser } from "@/lib/auth-guards";
import { listOrdersForUser } from "@/lib/dashboard";
import { parseOrderStatus } from "@/lib/status-values";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { OrderRow } from "@/components/dashboard/order-row";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Orders",
  robots: { index: false, follow: false },
};

const filters = [
  { label: "All", value: undefined },
  { label: "Paid", value: "PAID" },
  { label: "Pending", value: "PENDING" },
  { label: "Expired", value: "EXPIRED" },
  { label: "Refunded", value: "REFUNDED" },
] as const;

export default async function DashboardOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser();
  const { status: rawStatus } = await searchParams;
  const status = parseOrderStatus(rawStatus);
  const orders = await listOrdersForUser(user.id, status);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Checkout"
        title="Your orders"
        description="Receipts, payment status, and printable invoices for every checkout."
        actions={
          <ButtonLink href="/products" variant="outline" size="md">
            Browse kits
          </ButtonLink>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {filters.map((filter) => {
          const active = status === filter.value;
          const href = filter.value
            ? `/dashboard/orders?status=${filter.value}`
            : "/dashboard/orders";

          return (
            <Link
              key={filter.label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-9 items-center rounded-full border px-4 text-[11px] font-semibold transition-colors",
                active
                  ? "border-forest bg-forest text-bg"
                  : "border-line bg-surface text-ink/65 hover:border-ink/20 hover:text-ink",
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title={status ? `No ${status.toLowerCase()} orders` : "No orders yet"}
          description={
            status
              ? "Try another status filter or browse the catalog for a new kit."
              : "When you complete checkout, the order and its receipt land here."
          }
          action={
            <ButtonLink href="/products" variant="primary" size="md">
              Explore products
            </ButtonLink>
          }
        />
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </ul>
      )}
    </div>
  );
}
