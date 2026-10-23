import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  SlidersHorizontal,
} from "@phosphor-icons/react/ssr";

import { auth } from "@/auth";
import {
  CATALOG_SORT_OPTIONS,
  parseCatalogQuery,
  type CatalogQuery,
} from "@/lib/catalog-query";
import { getCatalogData } from "@/lib/catalog";
import { getMarketingSettings } from "@/lib/marketing";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PageShell } from "@/components/marketing/page-shell";
import { ProductCard } from "@/components/marketing/product-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All kits",
  description:
    "Browse production-ready source code, boilerplates, and developer kits. Filter by category, compare prices in IDR, and buy once.",
};

type ProductsPageProps = {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

function catalogHref(query: CatalogQuery, category: string | null): string {
  const params = new URLSearchParams();
  if (category) {
    params.set("category", category);
  }
  if (query.sort !== "featured") {
    params.set("sort", query.sort);
  }
  const search = params.toString();
  return search ? `/products?${search}` : "/products";
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const params = await searchParams;
  const query = parseCatalogQuery({
    category: params.category,
    sort: params.sort,
  });

  const [data, settings, session] = await Promise.all([
    getCatalogData(query),
    getMarketingSettings(),
    auth(),
  ]);

  const showingLabel =
    data.products.length === 1
      ? "1 kit"
      : `${data.products.length} kits`;

  return (
    <PageShell
      announcement={settings.announcement}
      isSignedIn={Boolean(session?.user)}
      className="pt-36 sm:pt-32"
    >
      <section className="noise-overlay relative isolate overflow-hidden bg-forest text-bg">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          <div className="absolute -top-28 -left-32 size-[30rem] rounded-full bg-mint/10 blur-[110px]" />
          <div className="absolute -right-24 bottom-0 size-[26rem] rounded-full bg-amber/10 blur-[110px]" />
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage:
                "linear-gradient(to bottom, black 0%, transparent 92%)",
            }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-5 pt-14 pb-16 sm:px-6 md:pt-20 md:pb-24">
          <div className="flex items-center gap-3 text-[10px] font-semibold tracking-[0.22em] text-bg/40 uppercase">
            <span aria-hidden="true" className="h-px w-8 bg-mint/50" />
            Catalog / 2026
          </div>

          <div className="mt-7 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end xl:gap-16">
            <div className="max-w-3xl">
              <h1 className="font-display text-[clamp(3.2rem,8vw,7rem)] leading-[0.86] font-semibold tracking-[-0.07em]">
                The shelf.
                <br />
                <span className="text-mint">Sorted by usefulness.</span>
              </h1>
              <p className="mt-7 max-w-xl text-[15px] leading-7 text-bg/55 sm:text-base">
                Every kit is a working foundation: source code, setup docs, and
                the awkward edge cases already handled. Buy once, keep the
                updates, own the code.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { value: data.totalCount, label: "kits" },
                { value: data.availableCount, label: "available" },
                { value: data.categories.length, label: "categories" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-5"
                >
                  <p className="font-display text-3xl font-medium tracking-[-0.05em] text-bg sm:text-4xl">
                    {String(stat.value).padStart(2, "0")}
                  </p>
                  <p className="mt-1 text-[8px] font-semibold tracking-[0.16em] text-bg/40 uppercase sm:text-[9px]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <svg
          aria-hidden="true"
          viewBox="0 0 1440 90"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 z-20 h-[42px] w-full text-bg md:h-[64px]"
        >
          <path
            fill="currentColor"
            d="M0 54c170-38 312-34 478 4 166 38 292 31 472-2 180-33 316-36 490-4v44H0V54Z"
          />
        </svg>
      </section>

      <section className="bg-bg pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div className="mt-10 flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
                <SlidersHorizontal size={13} weight="light" aria-hidden="true" />
                Filter
              </span>
              <Link
                href={catalogHref(query, null)}
                aria-current={!query.category ? "page" : undefined}
                className={
                  query.category
                    ? "rounded-full border border-line bg-surface px-3.5 py-2 text-[11px] font-medium text-muted transition-colors hover:border-ink/20 hover:text-ink"
                    : "rounded-full border border-forest bg-forest px-3.5 py-2 text-[11px] font-medium text-bg"
                }
              >
                All
              </Link>
              {data.categories.map((category) => {
                const active = query.category === category;

                return (
                  <Link
                    key={category}
                    href={catalogHref(query, category)}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "rounded-full border border-forest bg-forest px-3.5 py-2 text-[11px] font-medium text-bg"
                        : "rounded-full border border-line bg-surface px-3.5 py-2 text-[11px] font-medium text-muted transition-colors hover:border-ink/20 hover:text-ink"
                    }
                  >
                    {category}
                  </Link>
                );
              })}
            </div>

            <form
              method="get"
              action="/products"
              className="flex flex-wrap items-center gap-2"
            >
              {query.category ? (
                <input
                  type="hidden"
                  name="category"
                  value={query.category}
                />
              ) : null}
              <label
                htmlFor="catalog-sort"
                className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase"
              >
                Sort
              </label>
              <div className="relative">
                <select
                  id="catalog-sort"
                  name="sort"
                  defaultValue={query.sort}
                  className="h-10 appearance-none rounded-full border border-line bg-surface pr-9 pl-4 text-[11px] font-medium text-ink focus:border-ink/30 focus:outline-none"
                >
                  {CATALOG_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ArrowDown
                  size={12}
                  weight="bold"
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted"
                />
              </div>
              <button
                type="submit"
                className="h-10 rounded-full border border-ink/15 px-4 text-[11px] font-semibold text-ink transition-colors hover:bg-surface"
              >
                Apply
              </button>
            </form>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] tracking-[0.04em] text-muted">
              Showing <span className="font-mono text-ink">{showingLabel}</span>{" "}
              {query.category ? (
                <>
                  in <span className="text-ink">{query.category}</span>
                </>
              ) : (
                "across the full shelf"
              )}
              .
            </p>
            {query.category ? (
              <Link
                href={catalogHref(query, null)}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-forest transition-colors hover:text-ink"
              >
                Clear filter
                <ArrowUpRight size={12} weight="bold" aria-hidden="true" />
              </Link>
            ) : null}
          </div>

          {data.products.length > 0 ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {data.products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  layout="grid"
                />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-card border border-line bg-surface p-8 text-center sm:p-12">
              <Badge tone="muted">Nothing here yet</Badge>
              <h2 className="mt-5 font-display text-3xl font-medium tracking-[-0.04em] text-ink">
                No kits in this category.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted">
                The shelf changes as new kits ship. Try another category or
                browse everything available today.
              </p>
              <ButtonLink
                href="/products"
                variant="primary"
                size="md"
                className="mt-6"
              >
                View all kits
                <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
              </ButtonLink>
            </div>
          )}

          <div className="mt-12 flex flex-col gap-4 rounded-card border border-line bg-surface px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p className="max-w-xl text-[12px] leading-6 text-muted">
              Every license includes the source code, setup documentation, and
              lifetime updates. Need a team or agency license?{" "}
              <Link
                href="/pricing"
                className="font-semibold text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-ink"
              >
                Compare licenses
              </Link>
              .
            </p>
            <span className="shrink-0 font-mono text-[9px] tracking-[0.16em] text-muted uppercase">
              Prices in IDR
            </span>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
