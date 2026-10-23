import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Minus,
} from "@phosphor-icons/react/ssr";

import { auth } from "@/auth";
import {
  licenseComparison,
  licenseTiers,
  type LicenseComparisonRow,
} from "@/config/pricing";
import { siteConfig } from "@/config/site";
import { formatIdr } from "@/lib/format";
import { getProductBySlug } from "@/lib/catalog";
import { getMarketingSettings } from "@/lib/marketing";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { PageShell } from "@/components/marketing/page-shell";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Compare personal, team, and agency licenses for CodeGems source code, boilerplates, and developer kits. One-time IDR pricing with lifetime updates.",
};

function ComparisonValue({ value }: { value: LicenseComparisonRow["personal"] }) {
  if (typeof value === "string") {
    return <span className="text-[11px] text-ink/75">{value}</span>;
  }

  return value ? (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-forest">
      <Check size={13} weight="bold" aria-hidden="true" />
      <span className="sr-only">Included</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-muted">
      <Minus size={13} weight="bold" aria-hidden="true" />
      <span className="sr-only">Not included</span>
    </span>
  );
}

export default async function PricingPage() {
  const [settings, session, bundle] = await Promise.all([
    getMarketingSettings(),
    auth(),
    getProductBySlug("launch-kit-bundle"),
  ]);

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
          <div className="absolute -top-16 right-0 size-[26rem] rounded-full bg-mint/20 blur-[110px]" />
          <div className="absolute top-32 -left-24 size-[22rem] rounded-full bg-amber/10 blur-[100px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-5 pt-8 sm:px-6 md:pt-10">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="flex items-center gap-3 text-[10px] font-semibold tracking-[0.22em] text-muted uppercase">
                <span aria-hidden="true" className="h-px w-8 bg-ink/20" />
                Licensing / straightforward
              </div>
              <h1 className="mt-6 max-w-4xl font-display text-[clamp(3rem,7vw,6.4rem)] leading-[0.88] font-semibold tracking-[-0.07em] text-ink">
                Buy once.
                <br />
                <span className="text-muted">Ship without a subscription.</span>
              </h1>
              <p className="mt-7 max-w-2xl text-[15px] leading-7 text-muted sm:text-base">
                One payment, source code you own, and every update we ship.
                Choose the license that matches the number of people building
                the product.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Badge tone="mint" dot>
                One-time IDR
              </Badge>
              <Badge tone="line">Lifetime updates</Badge>
              <Badge tone="line">No seat subscription</Badge>
            </div>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-3 lg:gap-5">
            {licenseTiers.map((tier) => {
              const dark = tier.highlighted;

              return (
                <article
                  key={tier.id}
                  className={cn(
                    "relative flex flex-col overflow-hidden rounded-card border p-6 sm:p-7",
                    dark
                      ? "border-white/10 bg-forest text-bg shadow-soft"
                      : "border-line bg-surface text-ink",
                  )}
                >
                  {dark ? (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-mint/15 blur-[80px]"
                    />
                  ) : null}

                  <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
                    <Badge tone={dark ? "dark" : "line"}>{tier.eyebrow}</Badge>
                    <span
                      className={cn(
                        "text-[8px] font-semibold tracking-[0.14em] uppercase",
                        dark ? "text-mint/70" : "text-muted",
                      )}
                    >
                      {tier.availableAtCheckout
                        ? "At checkout"
                        : "Manual invoice"}
                    </span>
                  </div>

                  <h2
                    className={cn(
                      "relative z-10 mt-6 font-display text-[40px] leading-none font-semibold tracking-[-0.06em]",
                      dark ? "text-bg" : "text-ink",
                    )}
                  >
                    {tier.name}
                  </h2>
                  <p
                    className={cn(
                      "relative z-10 mt-3 min-h-12 text-[12px] leading-6",
                      dark ? "text-bg/55" : "text-muted",
                    )}
                  >
                    {tier.description}
                  </p>

                  <div
                    className={cn(
                      "relative z-10 mt-7 border-t pt-6",
                      dark ? "border-white/10" : "border-line",
                    )}
                  >
                    <p
                      className={cn(
                        "text-[8px] font-semibold tracking-[0.16em] uppercase",
                        dark ? "text-bg/35" : "text-muted",
                      )}
                    >
                      From
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
                      <span
                        className={cn(
                          "font-mono text-[27px] font-medium tracking-tight",
                          dark ? "text-bg" : "text-ink",
                        )}
                      >
                        {formatIdr(tier.priceIdr)}
                      </span>
                      <span
                        className={cn(
                          "text-[10px]",
                          dark ? "text-bg/40" : "text-muted",
                        )}
                      >
                        one-time
                      </span>
                    </div>
                    <p
                      className={cn(
                        "mt-1 text-[10px] leading-5",
                        dark ? "text-bg/40" : "text-muted",
                      )}
                    >
                      {tier.bestFor}
                    </p>
                  </div>

                  <ButtonLink
                    href={tier.cta.href}
                    variant={dark ? "mint" : "primary"}
                    size="md"
                    className="relative z-10 mt-6 w-full"
                  >
                    {tier.cta.label}
                    <ArrowUpRight
                      size={14}
                      weight="bold"
                      aria-hidden="true"
                    />
                  </ButtonLink>

                  <ul
                    className={cn(
                      "relative z-10 mt-6 space-y-3 border-t pt-5",
                      dark ? "border-white/10" : "border-line",
                    )}
                  >
                    {tier.features.map((feature) => (
                      <li
                        key={feature}
                        className={cn(
                          "flex items-start gap-2.5 text-[11px] leading-5",
                          dark ? "text-bg/65" : "text-muted",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
                            dark
                              ? "bg-mint/15 text-mint"
                              : "bg-mint/25 text-forest",
                          )}
                        >
                          <Check
                            size={9}
                            weight="bold"
                            aria-hidden="true"
                          />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>

          <p className="mt-6 max-w-3xl text-[10px] leading-6 text-muted">
            Personal checkout is being enabled in the next release. Team and
            agency licenses are invoiced manually today. Prices are in IDR and
            exclude any local taxes.
          </p>
        </div>
      </section>

      <section className="border-y border-line bg-surface py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <SectionHeading
            eyebrow="Compare"
            title={
              <>
                Same code.
                <br />
                <span className="text-muted">Different scope.</span>
              </>
            }
            description="Every tier gets the full source code and lifetime updates. The difference is how many people can build with it and where the work ships."
            action={
              <span className="font-mono text-[9px] tracking-[0.16em] text-muted uppercase">
                Effective today
              </span>
            }
          />

          <div
            className="mt-10 overflow-x-auto rounded-card border border-line bg-bg [contain:paint] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest"
            role="region"
            aria-label="License comparison table"
            aria-describedby="license-compare-hint"
            tabIndex={0}
          >
            <table className="w-full min-w-[680px] border-collapse text-left">
              <caption className="sr-only">
                Comparison of personal, team, and agency CodeGems licenses
              </caption>
              <thead>
                <tr className="border-b border-line">
                  <th
                    scope="col"
                    className="px-5 py-4 text-[9px] font-semibold tracking-[0.16em] text-muted uppercase sm:px-6"
                  >
                    Included
                  </th>
                  {licenseTiers.map((tier) => (
                    <th
                      key={tier.id}
                      scope="col"
                      className="px-5 py-4 text-[10px] font-semibold tracking-[0.08em] text-ink sm:px-6"
                    >
                      {tier.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {licenseComparison.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-line last:border-b-0"
                  >
                    <th
                      scope="row"
                      className="px-5 py-4 text-[11px] font-medium text-ink/65 sm:px-6"
                    >
                      {row.label}
                    </th>
                    <td className="px-5 py-4 sm:px-6">
                      <ComparisonValue value={row.personal} />
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <ComparisonValue value={row.team} />
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <ComparisonValue value={row.agency} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p
            id="license-compare-hint"
            className="mt-2 text-[10px] leading-5 text-muted sm:hidden"
          >
            Scroll sideways to compare all three licenses.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-2xl text-[10px] leading-5 text-muted">
              Need something outside these tiers? Email{" "}
              <a
                href={`mailto:${siteConfig.supportEmail}`}
                className="font-semibold text-ink underline decoration-line underline-offset-4"
              >
                {siteConfig.supportEmail}
              </a>{" "}
              with the scope and we will answer with a clear quote.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-forest transition-colors hover:text-ink"
            >
              Browse the kits
              <ArrowUpRight size={12} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-bg py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div className="noise-overlay relative overflow-hidden rounded-card border border-white/5 bg-forest p-7 text-bg shadow-soft sm:p-10 md:p-14">
            <div
              aria-hidden="true"
              className="absolute -top-28 -right-20 size-[26rem] rounded-full bg-mint/10 blur-[100px]"
            />
            <div className="relative z-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div>
                <Badge tone="dark" dot>
                  The shortcut
                </Badge>
                <h2 className="mt-6 max-w-2xl font-display text-[clamp(2.4rem,5vw,4.5rem)] leading-[0.94] font-semibold tracking-[-0.06em]">
                  Take the whole shelf
                  <br />
                  <span className="text-mint">for one price.</span>
                </h2>
                <p className="mt-5 max-w-xl text-[13px] leading-7 text-bg/55">
                  {bundle?.tagline ??
                    "Every available kit in one launch-ready bundle. One license, every update, one clean launch path."}
                </p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end lg:flex-col lg:items-end">
                <div className="text-left sm:text-right">
                  <p className="font-mono text-[9px] tracking-[0.16em] text-bg/35 uppercase">
                    Bundle from
                  </p>
                  <p className="mt-1 font-mono text-[25px] font-medium tracking-tight">
                    {bundle?.effectivePriceLabel ?? "See current price"}
                  </p>
                </div>
                <ButtonLink
                  href="/products/launch-kit-bundle"
                  variant="mint"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  See the bundle
                  <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
