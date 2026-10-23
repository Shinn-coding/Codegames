import { ArrowDownRight, Check } from "@phosphor-icons/react/ssr";

import { siteConfig } from "@/config/site";
import type { LandingSettings, MarketingProduct } from "@/lib/marketing";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FeaturedCard } from "@/components/marketing/featured-card";

type HeroProps = {
  settings: LandingSettings;
  featured: MarketingProduct | null;
  featuredSeconds: number;
};

function splitHeadline(headline: string) {
  const marker = "Production-Ready";
  const markerIndex = headline.indexOf(marker);

  if (markerIndex === -1) {
    return { lead: "", emphasis: headline, finalWord: "" };
  }

  const lead = headline.slice(0, markerIndex).trim();
  const emphasis = headline.slice(markerIndex).trim();
  const words = emphasis.split(/\s+/);
  const finalWord = words.pop() ?? "";

  return {
    lead,
    emphasis: words.join(" "),
    finalWord,
  };
}

export function Hero({ settings, featured, featuredSeconds }: HeroProps) {
  const { lead, emphasis, finalWord } = splitHeadline(settings.headline);

  return (
    <section
      id="top"
      className="noise-overlay relative isolate overflow-hidden bg-forest text-bg"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
      >
        <div className="absolute -top-32 -left-40 size-[38rem] rounded-full bg-mint/10 blur-[130px]" />
        <div className="absolute top-1/3 -right-40 size-[34rem] rounded-full bg-[#6da98a]/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 size-[28rem] rounded-full bg-amber/5 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.55) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage:
              "linear-gradient(to bottom, black 0%, transparent 78%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 pt-36 pb-36 sm:px-6 md:pt-44 md:pb-44 lg:pt-48">
        <div className="grid items-center gap-14 lg:grid-cols-[1.04fr_0.96fr] lg:gap-16 xl:gap-20">
          <div className="max-w-2xl">
            <div className="mb-7 flex flex-wrap items-center gap-4">
              <Badge tone="dark" dot>
                {siteConfig.hero.eyebrow}
              </Badge>
              <span className="h-px w-10 bg-bg/20" aria-hidden="true" />
              <span className="font-mono text-[9px] tracking-[0.18em] text-bg/40 uppercase">
                Est. 2026 / IDR
              </span>
            </div>

            <h1 className="font-display text-[clamp(3.15rem,5.1vw,4.35rem)] leading-[0.9] font-semibold tracking-[-0.06em] text-bg">
              {lead ? (
                <span className="block text-bg/50">{lead}</span>
              ) : null}
              <span className="block">
                <span className="sm:whitespace-nowrap">{emphasis}</span>{" "}
                {finalWord ? <span className="text-mint">{finalWord}</span> : null}
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-[15px] leading-7 text-bg/60 sm:text-[17px] sm:leading-8">
              {settings.subheadline}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href={siteConfig.hero.primaryCta.href} variant="mint" size="lg">
                {siteConfig.hero.primaryCta.label}
                <ArrowDownRight size={17} weight="bold" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink
                href={siteConfig.hero.secondaryCta.href}
                variant="ghostLight"
                size="lg"
              >
                {siteConfig.hero.secondaryCta.label}
              </ButtonLink>
            </div>

            <ul className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
              {siteConfig.hero.trust.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-[10px] font-medium tracking-[0.12em] text-bg/45 uppercase"
                >
                  <span className="grid size-4 place-items-center rounded-full border border-mint/25 bg-mint/10 text-mint">
                    <Check size={9} weight="bold" aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <FeaturedCard
            featured={featured}
            initialSeconds={featuredSeconds}
            className="lg:ml-auto"
          />
        </div>
      </div>

      <svg
        aria-hidden="true"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 z-20 h-[64px] w-full text-bg md:h-[104px]"
      >
        <path
          fill="currentColor"
          d="M0 76C164 22 302 5 476 31c174 26 294 73 466 68 172-5 322-51 498-59v80H0V76Z"
        />
      </svg>
    </section>
  );
}
