import { ArrowUpRight, Check } from "@phosphor-icons/react/ssr";

import type { MarketingProduct } from "@/lib/marketing";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Countdown } from "@/components/marketing/countdown";
import { cn } from "@/lib/utils";

type FeaturedCardProps = {
  featured: MarketingProduct | null;
  initialSeconds: number;
  className?: string;
};

export function FeaturedCard({
  featured,
  initialSeconds,
  className,
}: FeaturedCardProps) {
  const deadline = featured?.earlyBirdEndsAt ?? null;

  return (
    <div className={cn("relative mx-auto w-full max-w-[560px]", className)}>
      <div
        aria-hidden="true"
        className="absolute inset-x-7 top-7 h-[calc(100%-3rem)] rotate-[5deg] rounded-card border border-white/10 bg-mint/5"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-7 top-7 h-[calc(100%-3rem)] -rotate-[3deg] rounded-card border border-white/10 bg-white/[0.025]"
      />

      <article className="relative overflow-hidden rounded-card border border-white/15 bg-[#152a21]/95 p-3 shadow-soft">
        <div className="relative aspect-[1/1.15] overflow-hidden rounded-[22px] bg-[#0e2018] sm:aspect-[1/1.02]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_8%,rgba(191,224,200,0.36),transparent_42%),radial-gradient(circle_at_88%_68%,rgba(217,164,65,0.16),transparent_40%),linear-gradient(160deg,#18382b_0%,#0d1f17_58%,#07110d_100%)]" />
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.09]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "42px 42px",
            }}
          />
          <span
            aria-hidden="true"
            className="absolute -right-6 top-16 font-mono text-[180px] leading-none font-semibold tracking-[-0.12em] text-mint/[0.055] select-none"
          >
            {">_"}
          </span>

          <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-4">
            <Badge tone="dark" dot>
              Featured bundle
            </Badge>
            <Countdown
              deadline={deadline}
              initialSeconds={initialSeconds}
              tone="light"
              className="w-[168px] sm:w-[198px]"
            />
          </div>

          <div className="absolute inset-x-4 top-[34%] z-10 overflow-hidden rounded-2xl border border-white/15 bg-[#08130f]/85 shadow-2xl backdrop-blur-md sm:inset-x-5">
            <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2.5">
              <span className="size-1.5 rounded-full bg-[#f08f74]" />
              <span className="size-1.5 rounded-full bg-[#d9a441]" />
              <span className="size-1.5 rounded-full bg-mint" />
              <span className="ml-auto font-mono text-[8px] tracking-[0.12em] text-bg/35 uppercase">
                launch.ts
              </span>
            </div>
            <div className="space-y-1.5 p-3 font-mono text-[8px] leading-[1.7] text-bg/55 sm:p-4 sm:text-[9.5px]">
              <p>
                <span className="text-bg/20">01</span>{" "}
                <span className="text-mint">import</span>{" "}
                <span className="text-bg/80">{"{ checkout, license }"}</span>{" "}
                <span className="text-mint">from</span>{" "}
                <span className="text-[#e8cb93]">
                  &quot;@codegems/kit&quot;
                </span>
              </p>
              <p>
                <span className="text-bg/20">02</span>{" "}
                <span className="text-bg/65">const</span> product ={" "}
                <span className="text-mint">await</span> checkout.
                <span className="text-[#9ec4d8]">create</span>(order)
              </p>
              <p>
                <span className="text-bg/20">03</span>{" "}
                <span className="text-bg/65">await</span> license.
                <span className="text-[#9ec4d8]">issue</span>(product)
              </p>
              <p className="flex items-center gap-1.5">
                <span className="text-bg/20">04</span>{" "}
                <span className="text-mint">export default</span> ship(product)
                <span className="inline-block h-3 w-1 bg-mint/80 motion-safe:animate-[ticker_1.4s_ease-in-out_infinite]" />
              </p>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-4 bg-gradient-to-t from-[#07110d] via-[#07110d]/75 to-transparent p-4 pt-16">
            <div>
              <div className="flex items-center gap-2 text-[9px] font-semibold tracking-[0.16em] text-mint/70 uppercase">
                <Check size={11} weight="bold" aria-hidden="true" />
                All access
              </div>
              <p className="mt-1.5 font-display text-xl font-medium tracking-[-0.04em] text-bg sm:text-2xl">
                Three kits. One license.
              </p>
            </div>
            <div className="hidden w-[126px] shrink-0 rotate-[-5deg] rounded-2xl border border-white/15 bg-[#1d3a2f] p-3 shadow-xl motion-safe:animate-[float_9s_ease-in-out_infinite] sm:block">
              <p className="text-[7px] font-semibold tracking-[0.16em] text-mint/55 uppercase">
                Included
              </p>
              <p className="mt-1 font-display text-sm font-medium text-bg">
                Payments
              </p>
              <div className="mt-2 h-1 w-12 rounded-full bg-mint/40" />
              <div className="mt-1 h-1 w-8 rounded-full bg-mint/20" />
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-[20px] bg-bg p-4 text-ink">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold tracking-[0.16em] text-muted uppercase">
                {featured
                  ? `${featured.category} · ${featured.version}`
                  : "Bundle · 2026.1"}
              </p>
              <h2 className="mt-1.5 truncate font-display text-[22px] leading-tight font-semibold tracking-[-0.045em]">
                {featured?.name ?? "Launch Kit Bundle"}
              </h2>
              <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted">
                {featured?.tagline ??
                  "Every available kit in one launch-ready bundle."}
              </p>
            </div>
            <ButtonLink
              href={`/products/${featured?.slug ?? "launch-kit-bundle"}`}
              variant="primary"
              aria-label={`View ${featured?.name ?? "the bundle"}`}
              className="h-11 w-11 shrink-0 px-0"
            >
              <ArrowUpRight size={18} weight="bold" aria-hidden="true" />
            </ButtonLink>
          </div>

          <div className="mt-4 flex items-end justify-between gap-3 border-t border-line pt-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-mono text-lg font-medium tracking-tight">
                {featured?.effectivePriceLabel ?? "See pricing"}
              </span>
              {featured?.compareAtLabel ? (
                <span className="font-mono text-[10px] text-muted line-through">
                  {featured.compareAtLabel}
                </span>
              ) : null}
            </div>
            <span className="text-[8px] font-semibold tracking-[0.14em] text-muted uppercase">
              One-time license
            </span>
          </div>
        </div>
      </article>
    </div>
  );
}
