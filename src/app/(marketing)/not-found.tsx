import { ArrowUpRight, MagnifyingGlass } from "@phosphor-icons/react/ssr";

import { auth } from "@/auth";
import { getMarketingSettings } from "@/lib/marketing";
import { ButtonLink } from "@/components/ui/button";
import { PageShell } from "@/components/marketing/page-shell";

export default async function MarketingNotFound() {
  const [settings, session] = await Promise.all([
    getMarketingSettings(),
    auth(),
  ]);

  return (
    <PageShell
      announcement={settings.announcement}
      isSignedIn={Boolean(session?.user)}
      className="pt-36 sm:pt-32"
    >
      <section className="relative overflow-hidden bg-bg py-20 md:py-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          <div className="absolute top-0 right-0 size-[26rem] rounded-full bg-mint/20 blur-[110px]" />
          <div className="absolute bottom-0 -left-24 size-[22rem] rounded-full bg-amber/10 blur-[100px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-5 text-center sm:px-6">
          <span className="mx-auto grid size-12 place-items-center rounded-full border border-line bg-surface text-forest">
            <MagnifyingGlass size={20} weight="light" aria-hidden="true" />
          </span>
          <p className="mt-7 font-mono text-[10px] tracking-[0.2em] text-muted uppercase">
            404 / Kit not found
          </p>
          <h1 className="mt-4 font-display text-[clamp(2.8rem,7vw,5.6rem)] leading-[0.9] font-semibold tracking-[-0.065em] text-ink">
            This one is not
            <br />
            <span className="text-muted">on the shelf.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-[14px] leading-7 text-muted">
            The kit may have moved, been renamed, or not shipped yet. The
            catalog has everything that is live today.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/products" variant="primary" size="lg">
              Browse the kits
              <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href="/" variant="outline" size="lg">
              Back home
            </ButtonLink>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
