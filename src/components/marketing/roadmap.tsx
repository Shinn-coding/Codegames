import { ArrowUpRight } from "@phosphor-icons/react/ssr";

import { siteConfig } from "@/config/site";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";

function statusTone(status: string) {
  if (status === "Shipped") {
    return "mint" as const;
  }
  if (status === "In progress") {
    return "amber" as const;
  }
  return "line" as const;
}

export function Roadmap() {
  return (
    <section id="roadmap" className="bg-bg py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <SectionHeading
          eyebrow="Roadmap / changelog"
          title={
            <>
              Built in public.
              <br />
              <span className="text-muted">Shipped on schedule.</span>
            </>
          }
          description="No mystery roadmap. Here is what shipped, what is shipping, and what we are deliberately taking our time with."
          action={
            <ButtonLink href="/changelog" variant="outline" size="md">
              Read the changelog
              <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
            </ButtonLink>
          }
        />

        <div className="relative mt-12">
          <div
            aria-hidden="true"
            className="absolute top-[52px] right-0 left-0 hidden h-px bg-line lg:block"
          />
          <ol className="grid gap-4 lg:grid-cols-3">
            {siteConfig.roadmap.map((release, index) => (
              <li key={release.version} className="h-full">
                <Reveal delay={index * 0.07} className="h-full">
                  <div className="group relative flex h-full flex-col rounded-card border border-line bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-ink/20 hover:shadow-lift md:p-7">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[10px] tracking-[0.14em] text-muted">
                        {release.version}
                      </span>
                      <Badge tone={statusTone(release.status)} dot>
                        {release.status}
                      </Badge>
                    </div>

                    <div className="mt-10 flex items-center gap-2">
                      <span className="size-2 rounded-full bg-mint ring-4 ring-mint/20" />
                      <span className="text-[9px] font-semibold tracking-[0.16em] text-muted uppercase">
                        {release.date}
                      </span>
                    </div>

                    <h3 className="mt-3 font-display text-[24px] leading-tight font-medium tracking-[-0.04em] text-ink">
                      {release.title}
                    </h3>
                    <p className="mt-3 text-[13px] leading-6 text-muted">
                      {release.description}
                    </p>

                    <div className="mt-auto flex items-center justify-between pt-8">
                      <span className="h-px flex-1 bg-line" />
                      <span className="ml-3 font-mono text-[8px] tracking-[0.16em] text-muted uppercase">
                        0{index + 1} / 03
                      </span>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-7 flex items-center gap-2 text-[10px] tracking-[0.08em] text-muted">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-mint" />
          Every release ships with a changelog and a migration note.
        </p>
      </div>
    </section>
  );
}
