import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
} from "@phosphor-icons/react/ssr";

import { auth } from "@/auth";
import { siteConfig } from "@/config/site";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog";
import { formatDate } from "@/lib/format";
import { getMarketingSettings } from "@/lib/marketing";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { PageShell } from "@/components/marketing/page-shell";
import { ProductCard } from "@/components/marketing/product-card";
import { ProductPurchasePanel } from "@/components/marketing/product-purchase-panel";

export const dynamic = "force-dynamic";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "Kit not found" };
  }

  return {
    title: product.name,
    description: product.tagline,
    openGraph: {
      title: `${product.name} — CodeGems`,
      description: product.tagline,
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const [settings, session, related] = await Promise.all([
    getMarketingSettings(),
    auth(),
    getRelatedProducts(product),
  ]);

  const available = product.status === "AVAILABLE";
  const latestRelease = product.changelog[0] ?? null;
  const licenseLabel =
    product.licenseType === "bundle" ? "Bundle · personal" : "Personal";
  const demoHref = product.demoUrl
    ? product.demoUrl
    : `mailto:${siteConfig.supportEmail}?subject=${encodeURIComponent(
        `Demo request for ${product.name}`,
      )}`;

  return (
    <PageShell
      announcement={settings.announcement}
      isSignedIn={Boolean(session?.user)}
      className="pt-36 sm:pt-32"
    >
      <section className="relative overflow-hidden bg-bg">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          <div className="absolute top-16 -left-28 size-[28rem] rounded-full bg-mint/20 blur-[120px]" />
          <div className="absolute top-40 right-0 size-[22rem] rounded-full bg-amber/10 blur-[110px]" />
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(22,36,31,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(22,36,31,0.55) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage:
                "linear-gradient(to bottom, black 0%, transparent 75%)",
            }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-5 pt-8 pb-16 sm:px-6 md:pt-10 md:pb-24">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-2 text-[10px] font-medium tracking-[0.06em] text-muted"
          >
            <Link href="/" className="transition-colors hover:text-ink">
              Home
            </Link>
            <span aria-hidden="true" className="text-muted/40">
              /
            </span>
            <Link
              href="/products"
              className="transition-colors hover:text-ink"
            >
              Products
            </Link>
            <span aria-hidden="true" className="text-muted/40">
              /
            </span>
            <span aria-current="page" className="text-ink">
              {product.name}
            </span>
          </nav>

          <div className="mt-9 grid gap-12 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start xl:gap-16">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={available ? "mint" : "muted"} dot>
                  {available ? "Available now" : "Coming soon"}
                </Badge>
                <Badge tone="line">{product.category}</Badge>
                <Badge tone="line">v{product.version}</Badge>
              </div>

              <h1 className="mt-6 max-w-4xl font-display text-[clamp(2.9rem,6.4vw,5.6rem)] leading-[0.9] font-semibold tracking-[-0.065em] text-ink">
                {product.name}
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted sm:text-xl sm:leading-9">
                {product.tagline}
              </p>
              <p className="mt-5 max-w-2xl text-[14px] leading-7 text-ink/65 sm:text-[15px]">
                {product.description}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <ButtonLink href="#whats-inside" variant="primary" size="md">
                  What&apos;s inside
                  <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
                </ButtonLink>
                <ButtonLink
                  href={demoHref}
                  variant="outline"
                  size="md"
                  target={product.demoUrl ? "_blank" : undefined}
                  rel={product.demoUrl ? "noreferrer" : undefined}
                >
                  {product.demoUrl ? "Open live demo" : "Request a demo"}
                </ButtonLink>
              </div>

              <div className="mt-9 flex flex-wrap gap-2">
                {product.stack.slice(0, 6).map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[9px] tracking-[0.06em] text-muted"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <dl className="mt-10 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-line pt-6 sm:grid-cols-4">
                <div>
                  <dt className="text-[8px] font-semibold tracking-[0.16em] text-muted uppercase">
                    Category
                  </dt>
                  <dd className="mt-1.5 text-[12px] font-medium text-ink">
                    {product.category}
                  </dd>
                </div>
                <div>
                  <dt className="text-[8px] font-semibold tracking-[0.16em] text-muted uppercase">
                    License
                  </dt>
                  <dd className="mt-1.5 text-[12px] font-medium text-ink">
                    {licenseLabel}
                  </dd>
                </div>
                <div>
                  <dt className="text-[8px] font-semibold tracking-[0.16em] text-muted uppercase">
                    Version
                  </dt>
                  <dd className="mt-1.5 font-mono text-[11px] text-ink">
                    v{product.version}
                  </dd>
                </div>
                <div>
                  <dt className="text-[8px] font-semibold tracking-[0.16em] text-muted uppercase">
                    Updated
                  </dt>
                  <dd className="mt-1.5 text-[12px] font-medium text-ink">
                    {latestRelease ? formatDate(latestRelease.date) : "—"}
                  </dd>
                </div>
              </dl>
            </div>

            <ProductPurchasePanel
              product={product}
              isSignedIn={Boolean(session?.user)}
            />
          </div>
        </div>
      </section>

      <section
        id="whats-inside"
        className="border-y border-line bg-surface py-20 md:py-28"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <SectionHeading
            eyebrow="What's inside"
            title={
              <>
                The parts you would
                <br />
                <span className="text-muted">have built anyway.</span>
              </>
            }
            description="Not a folder of snippets. A coherent base with the decisions already made, documented, and tested where it matters."
            action={
              <span className="font-mono text-[9px] tracking-[0.16em] text-muted uppercase">
                {product.features.length} core pieces
              </span>
            }
          />

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {product.features.map((feature, index) => (
              <div
                key={feature}
                className="group rounded-card border border-line bg-bg p-6 transition-colors hover:border-ink/20"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[9px] tracking-[0.14em] text-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="grid size-7 place-items-center rounded-full border border-mint/40 bg-mint/20 text-forest">
                    <Check size={12} weight="bold" aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-5 font-display text-[19px] leading-snug font-medium tracking-[-0.03em] text-ink">
                  {feature}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-bg py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="The stack"
              title={
                <>
                  Boring choices.
                  <br />
                  <span className="text-muted">On purpose.</span>
                </>
              }
              description="The stack is deliberately conventional. You should be able to hand this to a new developer and have them productive on day one."
            />
            <p className="mt-6 max-w-md text-[13px] leading-7 text-muted">
              Every dependency is listed in the repository with a reason to
              exist. No proprietary runtime, no hidden service, no lock-in.
            </p>
          </div>

          <div className="rounded-card bg-forest p-6 text-bg shadow-soft sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <Badge tone="dark">Built with</Badge>
              <span className="font-mono text-[9px] tracking-[0.14em] text-bg/40">
                v{product.version}
              </span>
            </div>

            <ul className="mt-7 grid gap-2 sm:grid-cols-2">
              {product.stack.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 font-mono text-[10px] tracking-[0.04em] text-bg/75"
                >
                  <span
                    aria-hidden="true"
                    className="size-1.5 shrink-0 rounded-full bg-mint"
                  />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 grid grid-cols-2 gap-5 border-t border-white/10 pt-5">
              <div>
                <p className="text-[8px] font-semibold tracking-[0.16em] text-bg/35 uppercase">
                  License
                </p>
                <p className="mt-1.5 text-[12px] text-bg/80">{licenseLabel}</p>
              </div>
              <div>
                <p className="text-[8px] font-semibold tracking-[0.16em] text-bg/35 uppercase">
                  Updates
                </p>
                <p className="mt-1.5 text-[12px] text-bg/80">
                  Lifetime, versioned
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <SectionHeading
            eyebrow="Changelog"
            title={
              <>
                Every release,
                <br />
                <span className="text-muted">documented.</span>
              </>
            }
            description="Read what changed before you pull. Notes are written for the person maintaining the code, not the changelog generator."
            action={
              <ButtonLink href="/changelog" variant="outline" size="md">
                Full changelog
                <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
              </ButtonLink>
            }
          />

          {product.changelog.length > 0 ? (
            <ol className="mt-10 border-t border-line">
              {product.changelog.map((release) => (
                <li
                  key={`${release.version}-${release.date}`}
                  className="grid gap-4 border-b border-line py-7 md:grid-cols-[150px_1fr] md:gap-10"
                >
                  <div>
                    <p className="font-mono text-[11px] font-medium text-ink">
                      v{release.version}
                    </p>
                    <p className="mt-1 text-[9px] font-semibold tracking-[0.14em] text-muted uppercase">
                      {formatDate(release.date)}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-display text-[23px] leading-tight font-medium tracking-[-0.04em] text-ink">
                      {release.title}
                    </h3>
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {release.notes.map((note) => (
                        <li
                          key={note}
                          className="flex items-start gap-2.5 text-[12px] leading-5 text-muted"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-1.5 size-1.5 shrink-0 rounded-full bg-mint"
                          />
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-10 rounded-card border border-line bg-bg p-8 text-sm text-muted">
              The first release notes are being prepared. Check back soon.
            </p>
          )}
        </div>
      </section>

      {related.length > 0 ? (
        <section className="bg-bg py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="flex items-center gap-3 text-[10px] font-semibold tracking-[0.22em] text-muted uppercase">
                  <span aria-hidden="true" className="h-px w-8 bg-ink/20" />
                  Keep browsing
                </p>
                <h2 className="mt-4 font-display text-[clamp(2.2rem,4.5vw,3.4rem)] leading-[0.98] font-semibold tracking-[-0.055em] text-ink">
                  More from the shelf.
                </h2>
              </div>
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-forest transition-colors hover:text-ink"
              >
                <ArrowLeft size={13} weight="bold" aria-hidden="true" />
                All kits
              </Link>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {related.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  layout="grid"
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
