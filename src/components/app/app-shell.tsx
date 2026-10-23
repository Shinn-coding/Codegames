import Link from "next/link";
import { ArrowSquareOut, SignOut } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";

import { signOutAction } from "@/lib/sign-out-action";
import { Logo } from "@/components/marketing/logo";
import { AppNav, type AppNavItem } from "@/components/app/app-nav";

type AppShellProps = {
  area: "dashboard" | "admin";
  user: { name?: string | null; email?: string | null; role: string };
  children: ReactNode;
};

const dashboardNav: AppNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "overview", exact: true },
  { href: "/dashboard/orders", label: "Orders", icon: "orders" },
  { href: "/dashboard/licenses", label: "Licenses", icon: "licenses" },
  { href: "/dashboard/downloads", label: "Downloads", icon: "downloads" },
];

const adminNav: AppNavItem[] = [
  { href: "/admin", label: "Overview", icon: "overview", exact: true },
  { href: "/admin/products", label: "Products", icon: "products" },
  { href: "/admin/orders", label: "Orders", icon: "orders" },
  { href: "/admin/licenses", label: "Licenses", icon: "licenses" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
  { href: "/admin/audit", label: "Audit log", icon: "audit" },
];

export function AppShell({ area, user, children }: AppShellProps) {
  const items = area === "admin" ? adminNav : dashboardNav;
  const crossLink =
    area === "admin"
      ? { href: "/dashboard", label: "Customer dashboard" }
      : user.role === "ADMIN"
        ? { href: "/admin", label: "Admin console" }
        : null;

  return (
    <div className="min-h-[100dvh] bg-bg print:bg-white">
      <div className="mx-auto grid w-full max-w-[1440px] gap-6 px-5 pt-6 pb-16 sm:px-6 lg:grid-cols-[244px_minmax(0,1fr)] lg:gap-12 lg:px-8 lg:pt-8 print:block print:max-w-none print:p-0">
        <aside className="hidden lg:sticky lg:top-8 lg:flex lg:h-[calc(100dvh-4rem)] lg:flex-col print:hidden">
          <div>
            <Logo />
            <p className="mt-5 px-3 text-[9px] font-semibold tracking-[0.2em] text-muted/80 uppercase">
              {area === "admin" ? "Admin console" : "Customer library"}
            </p>
            <AppNav items={items} variant="sidebar" />
          </div>

          <div className="mt-auto space-y-3">
            {crossLink ? (
              <Link
                href={crossLink.href}
                className="flex items-center justify-between rounded-xl border border-line bg-surface px-3 py-2.5 text-[12px] font-medium text-ink/70 transition-colors hover:border-ink/20 hover:text-ink"
              >
                {crossLink.label}
                <ArrowSquareOut size={14} aria-hidden="true" />
              </Link>
            ) : null}

            <div className="rounded-2xl border border-line bg-surface p-3.5">
              <p className="truncate text-[12px] font-semibold text-ink">
                {user.name ?? "CodeGems customer"}
              </p>
              <p className="mt-0.5 truncate text-[10px] text-muted">{user.email}</p>
              <form action={signOutAction} className="mt-3">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted transition-colors hover:text-ink"
                >
                  <SignOut size={13} aria-hidden="true" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="lg:hidden print:hidden">
            <div className="flex items-center justify-between gap-3">
              <Logo />
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-full border border-line bg-surface px-3.5 py-2 text-[11px] font-semibold text-ink/70"
                >
                  Sign out
                </button>
              </form>
            </div>
            <div className="mt-5">
              <AppNav items={items} variant="mobile" />
            </div>
          </header>

          <main className="mt-6 lg:mt-0 print:mt-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
