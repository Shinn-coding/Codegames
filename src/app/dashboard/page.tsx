import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  DownloadSimple,
  Key,
  Receipt,
  Wallet,
} from "@phosphor-icons/react/ssr";

import { requireUser } from "@/lib/auth-guards";
import { getUserDashboard } from "@/lib/dashboard";
import { formatDateTime, formatIdr } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader, SectionHeading, StatCard } from "@/components/app/page-header";
import { LicenseCard } from "@/components/dashboard/license-card";
import { OrderRow } from "@/components/dashboard/order-row";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getUserDashboard(user.id);

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Customer library"
        title={`Welcome back${user.name ? `, ${user.name.split(" ")[0]}` : ""}.`}
        description="Your orders, licenses, and private downloads — all in one place."
        actions={
          <>
            <ButtonLink href="/products" variant="primary" size="md">
              Browse kits
            </ButtonLink>
            <ButtonLink href="/dashboard/licenses" variant="outline" size="md">
              My licenses
            </ButtonLink>
          </>
        }
      />

      <section aria-label="Account summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Orders"
          value={data.orderCount}
          hint={`${data.paidOrderCount} paid`}
        />
        <StatCard
          label="Active licenses"
          value={data.activeLicenseCount}
          hint="Ready to activate and download"
        />
        <StatCard
          label="Downloads"
          value={data.downloadCount}
          hint="Private link uses on record"
        />
        <StatCard
          label="Total spent"
          value={formatIdr(data.totalSpentIdr)}
          mono
          hint="Paid orders only"
        />
      </section>

      <section aria-labelledby="recent-orders" className="space-y-4">
        <SectionHeading
          id="recent-orders"
          title="Recent orders"
          description="Every checkout is stored against your account."
          action={
            <Link
              href="/dashboard/orders"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-forest transition-colors hover:text-ink"
            >
              All orders
              <ArrowRight size={12} weight="bold" aria-hidden="true" />
            </Link>
          }
        />

        {data.recentOrders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="Pick a kit, pay through checkout, and the receipt plus license will appear here."
            action={
              <ButtonLink href="/products" variant="primary" size="md">
                Explore products
              </ButtonLink>
            }
          />
        ) : (
          <ul className="space-y-3">
            {data.recentOrders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="recent-licenses" className="space-y-4">
        <SectionHeading
          id="recent-licenses"
          title="Licenses"
          description="Keys are stored hashed. Only the masked value can be shown again."
          action={
            <Link
              href="/dashboard/licenses"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-forest transition-colors hover:text-ink"
            >
              All licenses
              <ArrowRight size={12} weight="bold" aria-hidden="true" />
            </Link>
          }
        />

        {data.recentLicenses.length === 0 ? (
          <EmptyState
            title="No licenses yet"
            description="A license is issued automatically the moment a payment is recorded."
            action={
              <ButtonLink href="/products" variant="outline" size="md">
                Find your first kit
              </ButtonLink>
            }
          />
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {data.recentLicenses.map((license) => (
              <LicenseCard key={license.id} license={license} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="recent-downloads" className="space-y-4">
        <SectionHeading
          id="recent-downloads"
          title="Recent downloads"
          description="We log each token use so you can spot anything unexpected."
          action={
            <Link
              href="/dashboard/downloads"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-forest transition-colors hover:text-ink"
            >
              Full history
              <ArrowRight size={12} weight="bold" aria-hidden="true" />
            </Link>
          }
        />

        {data.recentDownloads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface/60 px-5 py-6">
            <p className="text-sm text-muted">
              No downloads recorded yet. Open a license to generate a private
              link.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {data.recentDownloads.map((log) => (
              <li
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-lg bg-mint/25 text-forest">
                    <DownloadSimple size={14} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[13px] font-medium text-ink">
                      {log.license.product.name}
                    </p>
                    <p className="font-mono text-[10px] text-muted">
                      GABUT-••••-••••-••••-{log.license.keyLast4}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-muted">
                  {formatDateTime(log.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: Key,
            title: "Activate",
            body: "POST your key and an instance ID to the activation API.",
            href: "/dashboard/licenses",
            label: "License details",
          },
          {
            icon: DownloadSimple,
            title: "Download",
            body: "Links are private, expire in 30 minutes, and allow two uses.",
            href: "/dashboard/downloads",
            label: "Download history",
          },
          {
            icon: Receipt,
            title: "Receipts",
            body: "Every paid order has a printable invoice for your records.",
            href: "/dashboard/orders",
            label: "Order list",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="rounded-2xl border border-line bg-surface p-5"
            >
              <Icon size={18} weight="light" className="text-forest" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-ink">{item.title}</p>
              <p className="mt-1.5 text-[11px] leading-5 text-muted">{item.body}</p>
              <Link
                href={item.href}
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-forest hover:text-ink"
              >
                {item.label}
                <ArrowRight size={11} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          );
        })}
      </section>

      <div className="flex items-center gap-2 rounded-2xl border border-line bg-bg/60 px-4 py-3 text-[11px] text-muted">
        <Wallet size={14} aria-hidden="true" />
        Paid with Midtrans or the local demo provider. Prices are charged once;
        there are no subscriptions.
      </div>
    </div>
  );
}
