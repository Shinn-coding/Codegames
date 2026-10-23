import { ArrowUpRight } from "@phosphor-icons/react/ssr";

import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

export function CtaBand() {
  return (
    <section className="bg-surface pb-24 md:pb-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <Reveal>
          <div className="noise-overlay relative overflow-hidden rounded-card border border-forest/10 bg-mint px-7 py-10 text-forest shadow-soft sm:px-10 sm:py-12 md:px-14 md:py-16 lg:px-16">
            <span
              aria-hidden="true"
              className="absolute -top-20 -right-10 font-mono text-[15rem] leading-none font-semibold tracking-[-0.14em] text-forest/[0.055] select-none sm:text-[20rem]"
            >
              {"</>"}
            </span>
            <div
              aria-hidden="true"
              className="absolute -bottom-24 -left-16 size-72 rounded-full border border-forest/10"
            />

            <div className="relative z-10 grid items-end gap-10 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <p className="flex items-center gap-3 text-[10px] font-semibold tracking-[0.2em] uppercase">
                  <span aria-hidden="true" className="h-px w-8 bg-forest/30" />
                  Ready when you are
                </p>
                <h2 className="mt-5 max-w-3xl font-display text-[clamp(2.7rem,5.6vw,5.4rem)] leading-[0.92] font-semibold tracking-[-0.065em]">
                  Stop rebuilding
                  <br />
                  the same foundation.
                </h2>
                <p className="mt-5 max-w-xl text-[14px] leading-7 text-forest/65 sm:text-[15px]">
                  Start from code that already handles the boring, risky parts.
                  Keep the architecture. Make the product yours.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
                <ButtonLink
                  href="/products"
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Browse the kits
                  <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
                </ButtonLink>
                <ButtonLink
                  href="/login"
                  variant="outline"
                  size="lg"
                  className="w-full border-forest/20 text-forest hover:border-forest/30 hover:bg-white/25 sm:w-auto"
                >
                  Create an account
                </ButtonLink>
                <p className="mt-1 text-[9px] font-medium tracking-[0.12em] text-forest/45 uppercase lg:text-right">
                  Instant download · Lifetime updates
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
