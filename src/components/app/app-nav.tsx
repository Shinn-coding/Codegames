"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DownloadSimple,
  Key,
  Package,
  Receipt,
  Scroll,
  SlidersHorizontal,
  SquaresFour,
  Storefront,
  type Icon,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

export type AppNavIcon =
  | "overview"
  | "orders"
  | "licenses"
  | "downloads"
  | "products"
  | "settings"
  | "audit"
  | "storefront";

const icons: Record<AppNavIcon, Icon> = {
  overview: SquaresFour,
  orders: Receipt,
  licenses: Key,
  downloads: DownloadSimple,
  products: Package,
  settings: SlidersHorizontal,
  audit: Scroll,
  storefront: Storefront,
};

export type AppNavItem = {
  href: string;
  label: string;
  icon: AppNavIcon;
  exact?: boolean;
};

export function AppNav({
  items,
  variant,
}: {
  items: AppNavItem[];
  variant: "sidebar" | "mobile";
}) {
  const pathname = usePathname();

  function isActive(item: AppNavItem) {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  if (variant === "mobile") {
    return (
      <nav aria-label="Section navigation" className="-mx-1 overflow-x-auto">
        <ul className="hide-scrollbar flex gap-1.5 px-1 pb-1">
          {items.map((item) => {
            const IconComponent = icons[item.icon];
            const active = isActive(item);

            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-[11px] font-semibold transition-colors",
                    active
                      ? "border-forest bg-forest text-bg"
                      : "border-line bg-surface text-ink/70 hover:border-ink/20 hover:text-ink",
                  )}
                >
                  <IconComponent size={14} weight={active ? "fill" : "regular"} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Section navigation" className="mt-8">
      <ul className="space-y-1">
        {items.map((item) => {
          const IconComponent = icons[item.icon];
          const active = isActive(item);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-forest text-bg shadow-[0_10px_24px_-18px_rgba(36,59,51,0.9)]"
                    : "text-ink/65 hover:bg-ink/[0.04] hover:text-ink",
                )}
              >
                <IconComponent
                  size={17}
                  weight={active ? "fill" : "regular"}
                  className={active ? "text-mint" : "text-muted group-hover:text-forest"}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
