import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle, CreditCard } from "@phosphor-icons/react/ssr";
import { z } from "zod";

import { auth } from "@/auth";
import { requireUser } from "@/lib/auth-guards";
import { formatDate, formatIdr } from "@/lib/format";
import { getMarketingSettings } from "@/lib/marketing";
import { setLicenseRevealCookie } from "@/lib/license-reveal";
import { getOrderForUser, settleMockOrder } from "@/lib/orders";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { PageShell } from "@/components/marketing/page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mock payment",
  robots: { index: false, follow: false },
};

const mockPaymentSchema = z.object({
  orderNumber: z.string().min(1).max(64),
});

async function payMockOrder(formData: FormData) {
  "use server";

  const user = await requireUser();
  const parsed = mockPaymentSchema.safeParse({
    orderNumber: formData.get("orderNumber"),
  });

  if (!parsed.success) {
    redirect("/dashboard");
  }

  const result = await settleMockOrder({
    orderNumber: parsed.data.orderNumber,
    userId: user.id,
  });

  if (result.licenseKey) {
    await setLicenseRevealCookie({
      orderNumber: result.order.orderNumber,
      userId: user.id,
      licenseKey: result.licenseKey,
    });
  }

  redirect(
    `/checkout/success?order=${encodeURIComponent(parsed.data.orderNumber)}`,
  );
}

export default async function MockCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const user = await requireUser();
  const { order: orderNumber } = await searchParams;

  if (!orderNumber) {
    notFound();
  }

  const [order, settings, session] = await Promise.all([
    getOrderForUser(orderNumber, user.id),
    getMarketingSettings(),
    auth(),
  ]);

  if (!order) {
    notFound();
  }

  if (order.status === "PAID" || order.status === "REFUNDED") {
    redirect(
      `/checkout/success?order=${encodeURIComponent(order.orderNumber)}`,
    );
  }

  const isPending = order.status === "PENDING";

  return (
    <PageShell
      announcement={settings.announcement}
      isSignedIn={Boolean(session?.user)}
      className="pt-36 sm:pt-32"
    >
      <section className="relative overflow-hidden bg-bg pb-20 md:pb-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          <div className="absolute top-10 left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-mint/20 blur-[130px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={`/products/${order.product.slug}`}
              className="inline-flex items-center gap-2 text-[11px] font-semibold text-forest transition-colors hover:text-ink"
            >
              <ArrowLeft size={13} weight="bold" aria-hidden="true" />
              Back to {order.product.name}
            </Link>
            <Badge tone={isPending ? "amber" : "muted"} dot>
              {order.status}
            </Badge>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <div className="rounded-card border border-line bg-surface p-6 shadow-soft sm:p-8">
              <p className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.18em] text-muted uppercase">
                <CreditCard size={14} weight="light" aria-hidden="true" />
                Local payment simulator
              </p>
              <h1 className="mt-4 font-display text-[clamp(2.4rem,5.5vw,4rem)] leading-[0.94] font-semibold tracking-[-0.055em] text-ink">
                Review the order.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-muted">
                This page replaces Midtrans Snap in demo mode. Completing the
                payment records the same idempotent settlement event used by the
                real webhook. No money moves.
              </p>

              <dl className="mt-8 grid gap-x-6 gap-y-5 border-t border-line pt-6 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[9px] font-semibold tracking-[0.16em] text-muted uppercase">
                    Product
                  </dt>
                  <dd className="mt-1.5 font-medium text-ink">
                    {order.product.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-[9px] font-semibold tracking-[0.16em] text-muted uppercase">
                    Order number
                  </dt>
                  <dd className="mt-1.5 font-mono text-[12px] text-ink">
                    {order.orderNumber}
                  </dd>
                </div>
                <div>
                  <dt className="text-[9px] font-semibold tracking-[0.16em] text-muted uppercase">
                    Email
                  </dt>
                  <dd className="mt-1.5 break-all text-ink">{order.email}</dd>
                </div>
                <div>
                  <dt className="text-[9px] font-semibold tracking-[0.16em] text-muted uppercase">
                    Expires
                  </dt>
                  <dd className="mt-1.5 text-ink">
                    {formatDate(order.expiresAt)}
                  </dd>
                </div>
              </dl>
            </div>

            <aside className="rounded-card border border-line bg-forest p-6 text-bg shadow-soft sm:p-7">
              <p className="text-[9px] font-semibold tracking-[0.18em] text-bg/40 uppercase">
                Amount due
              </p>
              <p className="mt-2 font-mono text-[34px] leading-none font-medium tracking-tight">
                {formatIdr(order.amountIdr)}
              </p>
              <p className="mt-2 text-[10px] tracking-[0.08em] text-bg/45 uppercase">
                {order.currency} · one-time
              </p>

              {isPending ? (
                <form action={payMockOrder} className="mt-7">
                  <input
                    type="hidden"
                    name="orderNumber"
                    value={order.orderNumber}
                  />
                  <Button
                    type="submit"
                    variant="mint"
                    size="lg"
                    className="w-full"
                  >
                    <CheckCircle size={17} weight="bold" aria-hidden="true" />
                    Simulate payment
                  </Button>
                  <p className="mt-3 text-center text-[10px] leading-5 text-bg/45">
                    Sends a mock settlement event for this order.
                  </p>
                </form>
              ) : (
                <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-bg/70">
                  This order is {order.status.toLowerCase()} and can no longer
                  be paid here.
                </div>
              )}

              <ButtonLink
                href="/dashboard"
                variant="ghostLight"
                size="md"
                className="mt-3 w-full"
              >
                View dashboard
              </ButtonLink>
            </aside>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
