import { ArrowUpRight, EnvelopeSimple } from "@phosphor-icons/react/ssr";

import { siteConfig } from "@/config/site";
import { Reveal } from "@/components/ui/reveal";
import { FaqAccordion } from "@/components/marketing/faq-accordion";

export function FaqSection() {
  return (
    <section id="faq" className="bg-surface py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
        <Reveal>
          <div className="lg:sticky lg:top-32">
            <div className="mb-5 flex items-center gap-3 text-[10px] font-semibold tracking-[0.22em] text-muted uppercase">
              <span aria-hidden="true" className="h-px w-8 bg-ink/20" />
              FAQ / 06
            </div>
            <h2 className="font-display text-[clamp(2.4rem,5vw,4.4rem)] leading-[0.98] font-semibold tracking-[-0.055em] text-ink">
              Questions,
              <br />
              <span className="text-muted">answered plainly.</span>
            </h2>
            <p className="mt-5 max-w-sm text-[14px] leading-7 text-muted">
              Licensing, updates, stack details, and the awkward edge cases.
              If something is still unclear, ask a human.
            </p>

            <a
              href={`mailto:${siteConfig.supportEmail}`}
              className="group mt-8 flex items-center justify-between gap-4 rounded-card border border-line bg-bg p-5 transition-colors hover:border-ink/20"
            >
              <span className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-forest text-mint">
                  <EnvelopeSimple
                    size={18}
                    weight="light"
                    aria-hidden="true"
                  />
                </span>
                <span>
                  <span className="block text-[9px] font-semibold tracking-[0.16em] text-muted uppercase">
                    Still deciding?
                  </span>
                  <span className="mt-1 block text-sm font-medium text-ink">
                    {siteConfig.supportEmail}
                  </span>
                </span>
              </span>
              <ArrowUpRight
                size={17}
                weight="light"
                className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </a>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <FaqAccordion items={siteConfig.faqs} />
        </Reveal>
      </div>
    </section>
  );
}
