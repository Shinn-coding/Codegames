import type { ReactNode } from "react";
import {
  ArrowsClockwise,
  ArrowDownRight,
  ChatCircleDots,
  Code,
  LockKey,
} from "@phosphor-icons/react/ssr";

import { siteConfig, type PrincipleIcon } from "@/config/site";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

const iconMap: Record<PrincipleIcon, ReactNode> = {
  code: <Code size={22} weight="light" aria-hidden="true" />,
  updates: <ArrowsClockwise size={22} weight="light" aria-hidden="true" />,
  lock: <LockKey size={22} weight="light" aria-hidden="true" />,
  support: <ChatCircleDots size={22} weight="light" aria-hidden="true" />,
};

export function Principles() {
  return (
    <section id="principles" className="bg-bg py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <SectionHeading
          eyebrow="Core principles"
          title={
            <>
              Built like a product,
              <br />
              <span className="text-muted">not a template dump.</span>
            </>
          }
          description="Every kit is something we would run ourselves: typed, tested, documented, and small enough to actually understand."
          action={
            <ButtonLink href="#products" variant="outline" size="md">
              Browse the shelf
              <ArrowDownRight size={15} weight="bold" aria-hidden="true" />
            </ButtonLink>
          }
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {siteConfig.principles.map((principle, index) => (
            <Reveal
              key={principle.title}
              delay={index * 0.06}
              className="h-full"
            >
              <article
                className={cn(
                  "group relative flex h-full flex-col overflow-hidden rounded-card border border-white/5 p-6 text-bg transition-all duration-300 hover:-translate-y-1 hover:border-mint/25 hover:shadow-soft md:p-7",
                  index === 1 ? "bg-forest-2" : "bg-forest",
                )}
              >
                <div
                  aria-hidden="true"
                  className="absolute -top-16 -right-16 size-40 rounded-full border border-white/10 transition-transform duration-500 group-hover:scale-110"
                />
                <div
                  aria-hidden="true"
                  className="absolute -right-8 -bottom-8 size-32 rounded-full bg-mint/5 blur-2xl"
                />

                <div className="relative flex items-center justify-between">
                  <span className="grid size-12 place-items-center rounded-2xl border border-mint/15 bg-mint/10 text-mint">
                    {iconMap[principle.icon]}
                  </span>
                  <span className="font-mono text-[9px] tracking-[0.18em] text-bg/65">
                    0{index + 1}
                  </span>
                </div>

                <h3 className="relative mt-14 font-display text-[22px] leading-tight font-medium tracking-[-0.04em]">
                  {principle.title}
                </h3>
                <p className="relative mt-3 text-[13px] leading-6 text-bg/80">
                  {principle.description}
                </p>

                <div className="relative mt-auto flex items-center justify-between pt-8">
                  <span className="h-px flex-1 bg-white/10" />
                  <span className="ml-3 font-mono text-[8px] tracking-[0.16em] text-bg/65 uppercase">
                    0{index + 1} / 04
                  </span>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
