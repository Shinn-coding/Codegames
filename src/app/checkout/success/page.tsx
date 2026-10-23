import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Key,
  Receipt,
  XCircle,
} from "@phosphor-icons/react/ssr";

import { auth } from "@/auth";
import { requireUser } from "@/lib/auth-guards";
import { formatDate, formatIdr } from "@/lib/format";
import { maskLicenseKey } from "@/lib/license-core";
import { peekLicenseRevealCookie } from "@/lib/license-reveal";
import { getMarketingSettings } from "@/lib/marketing";
import { getOrderForUser } from "@/lib/orders";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { LicenseDownload } from "@/components/checkout/license-download";
import { LicenseReveal } from "@/components/checkout/license-reveal";
import { PrintButton } from "@/components/checkout/print-button";
import { PageShell } from "@/components/marketing/page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order receipt",
  robots: { index: false, follow: false },
};

function statusContent(status: string) {
  switch (status) {
    case "PAID":
      return {
        eyebrow: "Payment received",
        title: "You're all set.",
        description:
          "The payment is recorded, your license is issued, and your receipt is ready below.",
        tone: "mint" as const,
        icon: CheckCircle,
      };
    case "PENDING":
      return {
        eyebrow: "Awaiting payment",
        title: "The order is waiting.",
        description:
          "We have not received a settlement for this order yet. Complete the payment step before the order expires.",
        tone: "amber" as const,
        icon: Clock,
      };
    case "EXPIRED":
      return {
        eyebrow: "Order expired",
        title: "This checkout timed out.",
        description:
          "The payment window closed before settlement. Start a new checkout from the product page when you are ready.",
        tone: "muted" as const,
        icon: Clock,
      };
    case "REFUNDED":
      return {
        eyebrow: "Refunded",
        title: "The order was refunded.",
        description:
          "This order has been marked as refunded. Contact support if you need the transaction reviewed.",
        tone: "line" as const,
        icon: Receipt,
      };
    default:
      return {
        eyebrow: "Payment failed",
        title: "The payment did not complete.",
        description:
          "No paid order was recorded. You can return to the product and try checkout again.",
        tone: "muted" as const,
        icon: XCircle,
      };
  }
}

export default async function CheckoutSuccessPage({
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

  const content = statusContent(order.status);
  const StatusIcon = content.icon;
  const canRetryMock =
    order.status === "PENDING" &&
    order.provider === "mock" &&
    Boolean(order.providerRef);
  const license = order.license;
  const licenseIsActive = license?.status === "ACTIVE";
  const canRevealLicense =
    licenseIsActive &&
    (await peekLicenseRevealCookie({
      orderNumber: order.orderNumber,
      userId: user.id,
    }));
  const maskedLicenseKey = license ? maskLicenseKey(license) : null;

  return (
    <PageShell
      announcement={settings.announcement}
      isSignedIn={Boolean(session?.user)}
      className="pt-36 pb-20 sm:pt-32 md:pb-28 print:pt-0 print:pb-0"
    >
      <div className="mx-auto max-w-5xl px-5 sm:px-6">
        <div className="print:hidden">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-[11px] font-semibold text-forest transition-colors hover:text-ink"
          >
            <ArrowLeft size={13} weight="bold" aria-hidden="true" />
            Back to dashboard
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.18em] text-muted uppercase">
              <StatusIcon size={15} weight="light" aria-hidden="true" />
              {content.eyebrow}
            </p>
            <h1 className="mt-4 font-display text-[clamp(2.5rem,6vw,4.6rem)] leading-[0.92] font-semibold tracking-[-0.06em] text-ink">
              {content.title}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted">
              {content.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Badge tone={content.tone} dot>
              {order.status}
            </Badge>
            <PrintButton />
          </div>
        </div>

        {canRetryMock ? (
          <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-amber/25 bg-amber/10 p-5 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <p className="text-sm leading-6 text-ink/75">
              The local payment simulator has not settled this order yet.
            </p>
            <ButtonLink
              href={`/checkout/mock?order=${encodeURIComponent(
                order.orderNumber,
              )}`}
              size="md"
              variant="primary"
              className="shrink-0"
            >
              Complete mock payment
            </ButtonLink>
          </div>
        ) : null}

        {license && maskedLicenseKey ? (
          <section
            aria-labelledby="license-heading"
            className="mt-8 rounded-card border border-mint/35 bg-mint/10 p-6 shadow-soft sm:p-8 print:hidden"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.18em] text-forest uppercase">
                  <Key size={14} weight="light" aria-hidden="true" />
                  Your license
                </p>
                <h2
                  id="license-heading"
                  className="mt-3 font-display text-[clamp(1.8rem,4vw,2.8rem)] leading-[0.98] font-semibold tracking-[-0.04em] text-ink"
                >
                  {licenseIsActive
                    ? "Keep this key safe."
                    : "This license is no longer active."}
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted">
                  {licenseIsActive
                    ? "The full key is shown once here and sent to your email. We store only a secure hash, so save it somewhere safe."
                    : "This order was refunded or the license expired, so activation is disabled."}
                </p>
              </div>
              <Badge tone={licenseIsActive ? "mint" : "muted"} dot>
                {license.status}
              </Badge>
            </div>

            {canRevealLicense ? (
              <LicenseReveal
                orderNumber={order.orderNumber}
                maskedKey={maskedLicenseKey}
              />
            ) : (
              <div className="mt-5 rounded-inner border border-line bg-surface/70 p-5">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
                  License key
                </p>
                <p className="mt-2 font-mono text-[16px] font-medium break-all text-ink">
                  {maskedLicenseKey}
                </p>
                <p className="mt-2 text-[11px] leading-5 text-muted">
                  {licenseIsActive
                    ? `The full key was shown once and emailed to ${order.email}.`
                    : "Contact support if you believe this license should be active."}
                </p>
              </div>
            )}

            <dl className="mt-5 grid gap-4 border-t border-forest/10 pt-5 text-[11px] sm:grid-cols-3">
              <div>
                <dt className="text-[9px] font-semibold tracking-[0.16em] text-muted uppercase">
                  Type
                </dt>
                <dd className="mt-1.5 font-medium capitalize text-ink">
                  {license.type}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] font-semibold tracking-[0.16em] text-muted uppercase">
                  Issued
                </dt>
                <dd className="mt-1.5 font-medium text-ink">
                  {formatDate(license.issuedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] font-semibold tracking-[0.16em] text-muted uppercase">
                  Activations
                </dt>
                <dd className="mt-1.5 font-medium text-ink">
                  {license.activationCount} / {license.maxActivations}
                </dd>
              </div>
            </dl>

            {licenseIsActive ? (
              <LicenseDownload licenseId={license.id} />
            ) : null}
          </section>
        ) : null}

        {order.status === "PAID" && !license ? (
          <div className="mt-8 rounded-2xl border border-amber/25 bg-amber/10 p-5 print:hidden">
            <p className="text-sm leading-6 text-ink/75">
              The payment is recorded, but the license is still being prepared.
              Refresh this receipt in a moment.
            </p>
          </div>
        ) : null}

        <article
          aria-label="Order receipt"
          className="mt-8 overflow-hidden rounded-card border border-line bg-surface shadow-soft print:border-0 print:shadow-none"
        >
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-bg/60 p-6 sm:p-8">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.18em] text-muted uppercase">
                <Receipt size={14} weight="light" aria-hidden="true" />
                CodeGems receipt
              </p>
              <p className="mt-2 font-mono text-[13px] font-medium text-ink">
                {order.orderNumber}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[9px] font-semibold tracking-[0.16em] text-muted uppercase">
                Issued
              </p>
              <p className="mt-1.5 text-sm text-ink">
                {formatDate(order.createdAt)}
              </p>
            </div>
          </header>

          <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[1.2fr_0.8fr]">
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
                    <tr className="border-b border-line">
                      <td className="py-4 align-top">
                        <p className="font-medium text-ink">
                          {order.product.name}
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                          v{order.product.version} ·{" "}
                          {order.product.licenseType === "bundle"
                            ? "Bundle · personal"
                            : "Personal"}{" "}
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

            <div className="rounded-inner border border-line bg-bg/60 p-5">
              <dl className="space-y-3 text-[12px]">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted">Status</dt>
                  <dd className="font-semibold text-ink">{order.status}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted">Provider</dt>
                  <dd className="font-medium text-ink">{order.provider}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted">Currency</dt>
                  <dd className="font-medium text-ink">{order.currency}</dd>
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

          <footer className="border-t border-line px-6 py-5 text-[10px] leading-5 text-muted sm:px-8">
            {order.provider === "mock"
              ? "Demo receipt: this order was settled by the local mock payment provider. No funds were captured."
              : "Payment processed by Midtrans. Keep this receipt for your records."}
          </footer>
        </article>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row print:hidden">
          <ButtonLink href="/products" variant="outline" size="md">
            Browse more kits
          </ButtonLink>
          <ButtonLink href="/dashboard" variant="ghost" size="md">
            View all orders
          </ButtonLink>
        </div>
      </div>
    </PageShell>
  );
}
