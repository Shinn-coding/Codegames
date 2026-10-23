import Link from "next/link";
import { ArrowUpRight, Receipt } from "@phosphor-icons/react/ssr";

import type { DashboardOrder } from "@/lib/dashboard";
import { formatDate, formatIdr } from "@/lib/format";
import { StatusBadge } from "@/components/app/status-badge";

export function orderAction(order: DashboardOrder) {
  if (order.status === "PENDING" && order.provider === "mock") {
    return {
      href: `/checkout/mock?order=${encodeURIComponent(order.orderNumber)}`,
      label: "Complete payment",
    };
  }

  if (order.status === "PENDING") {
    return {
      href: `/checkout/success?order=${encodeURIComponent(order.orderNumber)}`,
      label: "Payment status",
    };
  }

  return {
    href: `/checkout/success?order=${encodeURIComponent(order.orderNumber)}`,
    label: "View receipt",
  };
}

export function OrderRow({ order }: { order: DashboardOrder }) {
  const action = orderAction(order);

  return (
    <li className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink">{order.product.name}</p>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-2 font-mono text-[11px] tracking-tight text-muted">
            {order.orderNumber}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            {formatDate(order.createdAt)} · v{order.product.version}
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <p className="font-mono text-sm font-medium text-ink">
            {formatIdr(order.amountIdr)}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {order.status === "PAID" ? (
              <Link
                href={`/dashboard/orders/${encodeURIComponent(
                  order.orderNumber,
                )}/invoice`}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted transition-colors hover:text-ink"
              >
                <Receipt size={13} aria-hidden="true" />
                Invoice
              </Link>
            ) : null}
            <Link
              href={action.href}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-forest transition-colors hover:text-ink"
            >
              {action.label}
              <ArrowUpRight size={12} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}
