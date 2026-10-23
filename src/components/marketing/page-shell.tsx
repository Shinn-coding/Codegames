import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

type PageShellProps = {
  children: ReactNode;
  announcement?: string;
  isSignedIn: boolean;
  className?: string;
};

/**
 * Shared public marketing chrome. The landing page uses this without top
 * padding because its hero sits directly under the fixed header; catalog
 * pages pass a padding class so their page header clears the navigation.
 */
export function PageShell({
  children,
  announcement,
  isSignedIn,
  className,
}: PageShellProps) {
  return (
    <div className="min-h-screen bg-bg">
      <a
        href="#main"
        className="sr-only z-[100] rounded-full bg-mint px-4 py-2 text-sm font-semibold text-forest focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Skip to content
      </a>

      <div className="print:hidden">
        <SiteHeader announcement={announcement} isSignedIn={isSignedIn} />
      </div>

      <main id="main" tabIndex={-1} className={cn("outline-none", className)}>
        {children}
      </main>

      <div className="print:hidden">
        <SiteFooter />
      </div>
    </div>
  );
}
