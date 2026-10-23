import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  GitCommit,
} from "@phosphor-icons/react/ssr";

import { auth } from "@/auth";
import { getChangelogData } from "@/lib/catalog";
import { formatDate } from "@/lib/format";
import { getMarketingSettings } from "@/lib/marketing";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { PageShell } from "@/components/marketing/page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "Every CodeGems release, documented in the open. Read what changed across the SaaS starter, payment kit, licensing kit, and the rest of the shelf.",
};

export default async function ChangelogPage() {
  const [data, settings, session] = await Promise.all([
    getChangelogData(),
    getMarketingSettings(),
    auth(),
  ]);

  return (
    <PageShell
      announcement={settings.announcement}
      isSignedIn={Boolean(session?.user)}
      className="pt-36 sm:pt-32"
    >
      <section className="relative overflow-hidden bg-bg pb-16 md:pb-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          <div className="absolute -top-20 right-0 size-[28rem] rounded-full bg-mint/20 blur-[120px]" />
          <div className="absolute top-32 -left-28 size-[24rem] rounded-full bg-sky/15 blur-[110px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-5 pt-8 sm:px-6 md:pt-10">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="flex items-center gap-3 text-[10px] font-semibold tracking-[0.22em] text-muted uppercase">
                <span aria-hidden="true" className="h-px w-8 bg-ink/20" />
                Changelog / public by default
              </div>
              <h1 className="mt-6 max-w-4xl font-display text-[clamp(3rem,7vw,6.4rem)] leading-[0.88] font-semibold tracking-[-0.07em] text-ink">
                Every release.
                <br />
                <span className="text-muted">In the open.</span>
              </h1>
              <p className="mt-7 max-w-2xl text-[15px] leading-7 text-muted sm:text-base">
                No mystery updates. Here is what shipped, what changed, and
                what you should know before pulling the next version into your
                codebase.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-card border border-line bg-surface p-5">
                <p className="font-display text-4xl font-medium tracking-[-0.06em] text-ink">
                  {String(data.releaseCount).padStart(2, "0")}
                </p>
                <p className="mt-1 text-[8px] font-semibold tracking-[0.16em] text-muted uppercase">
                  Releases
                </p>
              </div>
              <div className="rounded-card border border-line bg-surface p-5">
                <p className="font-display text-4xl font-medium tracking-[-0.06em] text-ink">
                  {String(data.productCount).padStart(2, "0")}
                </p>
                <p className="mt-1 text-[8px] font-semibold tracking-[0.16em] text-muted uppercase">
                  Kits shipping
                </p>
              </div>
              <div className="col-span-2 flex items-center gap-3 rounded-card border border-line bg-forest p-5 text-bg">
                <span className="grid size-9 place-items-center rounded-full border border-mint/20 bg-mint/10 text-mint">
                  <GitCommit size={17} weight="light" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[8px] font-semibold tracking-[0.16em] text-bg/35 uppercase">
                    Latest release
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-bg/80">
                    {data.entries[0]
                      ? `${formatDate(data.entries[0].date)} · v${data.entries[0].version}`
                      : "Preparing the first release"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <SectionHeading
            eyebrow="Release history"
            title={
              <>
                Shipped,
                <br />
                <span className="text-muted">with receipts.</span>
              </>
            }
            description="Newest first. Each note links back to the kit it belongs to, so you can read the full product context before updating."
            action={
              <span className="font-mono text-[9px] tracking-[0.16em] text-muted uppercase">
                {data.releaseCount} entries
              </span>
            }
          />

          {data.entries.length > 0 ? (
            <ol className="mt-10 border-t border-line">
              {data.entries.map((entry) => (
                <li
                  key={`${entry.productSlug}-${entry.version}-${entry.date}`}
                  className="grid gap-5 border-b border-line py-8 md:grid-cols-[150px_1fr_180px] md:gap-8 md:py-9"
                >
                  <div>
                    <p className="font-mono text-[11px] font-medium text-ink">
                      v{entry.version}
                    </p>
                    <p className="mt-1 text-[9px] font-semibold tracking-[0.14em] text-muted uppercase">
                      {formatDate(entry.date)}
                    </p>
                  </div>

                  <div>
                    <h2 className="font-display text-[23px] leading-tight font-medium tracking-[-0.04em] text-ink">
                      {entry.title}
                    </h2>
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {entry.notes.map((note) => (
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

                  <div className="flex flex-col items-start gap-2 md:items-end md:text-right">
                    <Badge
                      tone={entry.status === "AVAILABLE" ? "mint" : "muted"}
                      dot
                    >
                      {entry.status === "AVAILABLE"
                        ? "Available"
                        : "Coming soon"}
                    </Badge>
                    <Link
                      href={`/products/${entry.productSlug}`}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-forest transition-colors hover:text-ink"
                    >
                      {entry.productName}
                      <ArrowUpRight
                        size={12}
                        weight="bold"
                        aria-hidden="true"
                      />
                    </Link>
                    <span className="font-mono text-[8px] tracking-[0.12em] text-muted uppercase">
                      {entry.category}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-10 rounded-card border border-line bg-bg p-8 text-center sm:p-12">
              <Badge tone="muted">Nothing shipped yet</Badge>
              <h2 className="mt-5 font-display text-3xl font-medium tracking-[-0.04em] text-ink">
                The first release is being prepared.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted">
                New kits and updates will appear here as soon as they are
                published. In the meantime, browse the current shelf.
              </p>
              <ButtonLink
                href="/products"
                variant="primary"
                size="md"
                className="mt-6"
              >
                Browse the kits
                <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
              </ButtonLink>
            </div>
          )}
        </div>
      </section>

      <section className="bg-bg py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div className="flex flex-col gap-6 rounded-card border border-line bg-surface p-7 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <p className="text-[9px] font-semibold tracking-[0.16em] text-muted uppercase">
                Keep shipping
              </p>
              <h2 className="mt-2 max-w-xl font-display text-[clamp(1.8rem,4vw,2.8rem)] leading-[1] font-semibold tracking-[-0.05em] text-ink">
                Start from a release that is already documented.
              </h2>
            </div>
            <ButtonLink
              href="/products"
              variant="primary"
              size="lg"
              className="w-full shrink-0 sm:w-auto"
            >
              Browse the shelf
              <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
            </ButtonLink>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
