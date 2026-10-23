import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/ssr";

import { requireUser } from "@/lib/auth-guards";
import { formatDate, formatIdr } from "@/lib/format";
import { getOrderForUser } from "@/lib/orders";
import { Badge } from "@/components/ui/badge";
import { PrintButton } from "@/components/checkout/print-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invoice",
  robots: { index: false, follow: false },
};

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const user = await requireUser();
  const { orderNumber } = await params;
  const order = await getOrderForUser(orderNumber, user.id);

  if (!order) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-2 text-[11px] font-semibold text-forest transition-colors hover:text-ink"
        >
          <ArrowLeft size={13} weight="bold" aria-hidden="true" />
          Back to orders
        </Link>
        <PrintButton />
      </div>

      <article className="mt-6 overflow-hidden rounded-card border border-line bg-surface shadow-soft print:mt-0 print:rounded-none print:border-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-5 border-b border-line bg-bg/50 p-7 sm:p-9">
          <div>
            <p className="font-display text-xl font-semibold tracking-[-0.04em] text-ink">
              CodeGems
            </p>
            <p className="mt-1 text-[10px] font-semibold tracking-[0.18em] text-muted uppercase">
              Invoice
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="font-mono text-[13px] font-medium text-ink">
              {order.orderNumber}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Issued {formatDate(order.createdAt)}
            </p>
            <div className="mt-2 flex sm:justify-end">
              <Badge tone={order.status === "PAID" ? "mint" : "muted"} dot>
                {order.status}
              </Badge>
            </div>
          </div>
        </header>

        <div className="grid gap-8 p-7 sm:p-9 md:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-[9px] font-semibold tracking-[0.16em] text-muted uppercase">
              Billed to
            </p>
            <p className="mt-2 text-sm font-medium break-all text-ink">
              {order.email}
            </p>

            <div className="mt-7 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-[9px] font-semibold tracking-[0.16em] text-muted uppercase">
                    <th scope="col" className="pb-3 font-semibold">
                      Item
                    </th>
                    <th scope="col" className="pb-3 text-right font-semibold">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-4 align-top">
                      <p className="font-medium text-ink">{order.product.name}</p>
                      <p className="mt-1 text-[11px] text-muted">
                        v{order.product.version} · {order.product.licenseType}{" "}
                        license
                      </p>
                    </td>
                    <td className="py-4 text-right font-mono text-[12px] whitespace-nowrap text-ink">
                      {formatIdr(order.amountIdr)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-inner border border-line bg-bg/50 p-5">
            <dl className="space-y-3 text-[12px]">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted">Currency</dt>
                <dd className="font-medium text-ink">{order.currency}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted">Provider</dt>
                <dd className="font-medium text-ink">{order.provider}</dd>
              </div>
              {order.paidAt ? (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted">Paid</dt>
                  <dd className="font-medium text-ink">
                    {formatDate(order.paidAt)}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4 border-t border-line pt-3">
                <dt className="text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">
                  Total
                </dt>
                <dd className="font-mono text-[16px] font-medium text-ink">
                  {formatIdr(order.amountIdr)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <footer className="border-t border-line px-7 py-5 text-[10px] leading-5 text-muted sm:px-9">
          {order.provider === "mock"
            ? "Demo invoice: settled by the local mock payment provider. No funds were captured."
            : "Payment processed by Midtrans. Keep this invoice for your records."}
        </footer>
      </article>
    </div>
  );
}
