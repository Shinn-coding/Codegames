import { ArrowDownRight, Check } from "@phosphor-icons/react/ssr";

import type { MarketingProduct } from "@/lib/marketing";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { ProductCover } from "@/components/marketing/product-cover";

type FeaturedBannerProps = {
  featured: MarketingProduct | null;
};

const included = [
  "Next.js SaaS Starter",
  "Midtrans Payment Kit",
  "License & Secure Download Kit",
];

export function FeaturedBanner({ featured }: FeaturedBannerProps) {
  const savings = featured?.earlyBirdActive
    ? Math.round((1 - featured.effectivePriceIdr / featured.priceIdr) * 100)
    : null;

  return (
    <section id="pricing" className="bg-bg pb-24 md:pb-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <Reveal>
          <div className="noise-overlay relative overflow-hidden rounded-card border border-white/5 bg-forest text-bg shadow-soft">
            <div
              aria-hidden="true"
              className="absolute -top-32 -left-20 size-[30rem] rounded-full bg-mint/10 blur-[100px]"
            />
            <div className="relative z-10 grid lg:grid-cols-[1.06fr_0.94fr]">
              <div className="p-7 sm:p-10 md:p-12 lg:p-14 xl:p-16">
                <Badge tone="dark" dot>
                  Bundle of the month
                </Badge>

                <h2 className="mt-6 font-display text-[clamp(2.7rem,5vw,4.75rem)] leading-[0.94] font-semibold tracking-[-0.06em]">
                  One bundle.
                  <br />
                  <span className="text-mint">Every launch kit.</span>
                </h2>

                <p className="mt-6 max-w-lg text-[14px] leading-7 text-bg/80 sm:text-[15px]">
                  {featured?.tagline ??
                    "Every available kit in one launch-ready bundle."}{" "}
                  Skip the assembly tax and start with the whole shelf.
                </p>

                <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                  {included.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2.5 text-[12px] text-bg/85"
                    >
                      <span className="grid size-5 shrink-0 place-items-center rounded-full border border-mint/20 bg-mint/10 text-mint">
                        <Check size={10} weight="bold" aria-hidden="true" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="mt-9 flex flex-col gap-5 border-t border-white/10 pt-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-mono text-[22px] font-medium tracking-tight sm:text-2xl">
                        {featured?.effectivePriceLabel ?? "See current price"}
                      </span>
                      {featured?.compareAtLabel ? (
                        <span className="font-mono text-[11px] text-bg/70 line-through">
                          {featured.compareAtLabel}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[9px] font-semibold tracking-[0.16em] text-bg/70 uppercase">
                      One-time license · Lifetime updates
                    </p>
                  </div>

                  <ButtonLink
                    href={
                      featured
                        ? `/products/${featured.slug}`
                        : "/products/launch-kit-bundle"
                    }
                    variant="mint"
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    See what&apos;s inside
                    <ArrowDownRight
                      size={16}
                      weight="bold"
                      aria-hidden="true"
                    />
                  </ButtonLink>
                </div>
              </div>

              <div className="relative min-h-[360px] overflow-hidden p-7 sm:min-h-[430px] sm:p-10 lg:min-h-full">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-[radial-gradient(circle_at_62%_42%,rgba(191,224,200,0.18),transparent_45%),radial-gradient(circle_at_78%_80%,rgba(217,164,65,0.12),transparent_38%)]"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-[0.1]"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                    backgroundSize: "44px 44px",
                    maskImage:
                      "radial-gradient(circle at center, black, transparent 74%)",
                  }}
                />

                <div className="relative z-10 mx-auto flex h-full max-w-[380px] items-center justify-center">
                  <div className="relative w-full rotate-[-4deg] rounded-card border border-white/15 bg-[#10231b] p-3 shadow-soft">
                    <ProductCover
                      name={featured?.name ?? "Launch Kit Bundle"}
                      category={featured?.category ?? "Bundle"}
                      version={featured?.version ?? "2026.1"}
                      gradient={featured?.coverGradient ?? "emerald"}
                      className="aspect-[4/3]"
                    />
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-inner bg-bg px-4 py-3 text-ink">
                      <span className="truncate font-display text-sm font-semibold tracking-[-0.02em]">
                        {featured?.name ?? "Launch Kit Bundle"}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-muted">
                        {featured?.effectivePriceLabel ?? "IDR"}
                      </span>
                    </div>
                  </div>

                  <div className="absolute -bottom-1 -left-1 rotate-[5deg] rounded-2xl border border-white/15 bg-mint px-4 py-3 text-forest shadow-xl motion-safe:animate-[float_8s_ease-in-out_infinite]">
                    <p className="text-[8px] font-semibold tracking-[0.16em] uppercase">
                      {savings ? "Early bird" : "Bundle saving"}
                    </p>
                    <p className="mt-0.5 font-display text-lg font-semibold">
                      {savings ? `Save ${savings}%` : "Three kits"}
                    </p>
                  </div>

                  <div className="absolute -top-1 -right-1 rotate-[6deg] rounded-2xl border border-white/15 bg-forest-2 px-4 py-3 text-bg shadow-xl">
                    <p className="text-[8px] font-semibold tracking-[0.16em] text-mint/75 uppercase">
                      Includes
                    </p>
                    <p className="mt-0.5 font-display text-lg font-semibold">
                      3 kits
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
