import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/ssr";

import { siteConfig } from "@/config/site";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/marketing/logo";

export function SiteFooter() {
  return (
    <footer className="bg-forest text-bg">
      <div className="mx-auto max-w-7xl px-5 pt-16 pb-8 sm:px-6 md:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Logo tone="light" />
            <p className="mt-6 max-w-sm text-[13px] leading-7 text-bg/75">
              Production-ready source code, boilerplates, and developer kits.
              Buy once, ship faster, own the code.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <Badge tone="dark">IDR pricing</Badge>
              <Badge tone="dark">Lifetime updates</Badge>
              <Badge tone="dark">Independent</Badge>
            </div>
          </div>

          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-8 sm:grid-cols-3"
          >
            {siteConfig.footer.columns.map((column) => (
              <div key={column.title}>
                <p className="text-[9px] font-semibold tracking-[0.18em] text-mint/80 uppercase">
                  {column.title}
                </p>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="group inline-flex items-center gap-1.5 text-[12px] text-bg/80 transition-colors hover:text-bg"
                      >
                        {link.label}
                        <ArrowUpRight
                          size={11}
                          weight="light"
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 text-[10px] tracking-[0.06em] text-bg/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} CodeGems. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-mint/60"
            />
            Built with Next.js 16 · Prices in IDR
          </p>
        </div>
      </div>
    </footer>
  );
}
