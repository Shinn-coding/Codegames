"use client";

import { ArrowUpRight, List, X } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { siteConfig } from "@/config/site";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/marketing/logo";
import { cn } from "@/lib/utils";

type SiteHeaderProps = {
  announcement?: string;
  isSignedIn: boolean;
};

export function SiteHeader({ announcement, isSignedIn }: SiteHeaderProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) {
        setOpen(false);
      }
    };

    closeOnDesktop();
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    firstLinkRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const isHome = pathname === "/";
  const darkText = !isHome || scrolled || open;
  const accountHref = isSignedIn ? "/dashboard" : "/login";
  const accountLabel = isSignedIn ? "Dashboard" : "Login";
  const closeMenu = () => {
    setOpen(false);
    window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  };
  const isActive = (href: string) => {
    const path = href.split("#")[0];
    if (!path || path === "/") {
      return false;
    }
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {announcement ? (
        <div className="bg-forest text-bg">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-[9px] font-medium tracking-[0.12em] uppercase sm:gap-3 sm:text-[10px]">
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-mint"
            />
            <span className="min-w-0 sm:truncate">{announcement}</span>
            <Link
              href="/products/launch-kit-bundle"
              className="hidden shrink-0 items-center gap-1 text-mint transition-colors hover:text-white sm:inline-flex"
            >
              See bundle
              <ArrowUpRight size={11} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "transition-[background-color,border-color,backdrop-filter] duration-300",
          darkText
            ? "border-b border-line bg-bg/90 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6">
          <Logo tone={darkText ? "dark" : "light"} />

          <nav
            aria-label="Primary"
            className="hidden items-center gap-7 lg:flex"
          >
            {siteConfig.nav.map((link) => {
              const active = isActive(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative text-[13px] font-medium transition-colors",
                    darkText
                      ? "text-ink/60 hover:text-ink"
                      : "text-bg/60 hover:text-bg",
                    active && (darkText ? "text-ink" : "text-bg"),
                    active &&
                      "after:absolute after:-bottom-2 after:left-0 after:h-px after:w-full after:bg-current",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            <span
              className={cn(
                "font-mono text-[9px] tracking-[0.18em]",
                darkText ? "text-muted" : "text-bg/40",
              )}
            >
              IDR
            </span>
            <ButtonLink
              href={accountHref}
              variant={darkText ? "primary" : "light"}
              size="sm"
            >
              {accountLabel}
              <ArrowUpRight size={13} weight="bold" aria-hidden="true" />
            </ButtonLink>
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
            className={cn(
              "grid size-11 place-items-center rounded-full border transition-colors lg:hidden",
              darkText
                ? "border-line text-ink hover:bg-surface"
                : "border-white/20 text-bg hover:bg-white/10",
            )}
          >
            {open ? (
              <X size={19} weight="light" aria-hidden="true" />
            ) : (
              <List size={19} weight="light" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        className={cn(
          "max-h-[calc(100dvh-8rem)] overflow-y-auto lg:hidden",
          open ? "block" : "hidden",
        )}
      >
        <div className="border-b border-line bg-surface px-5 pt-2 pb-6 shadow-soft sm:px-6">
          <nav aria-label="Mobile" className="flex flex-col">
            {siteConfig.nav.map((link, index) => {
              const active = isActive(link.href);

              return (
                <Link
                  key={link.href}
                  ref={index === 0 ? firstLinkRef : undefined}
                  href={link.href}
                  onClick={closeMenu}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center justify-between border-b border-line py-4 font-display text-2xl font-medium tracking-[-0.04em]",
                    active ? "text-forest" : "text-ink",
                  )}
                >
                  {link.label}
                  <span className="flex items-center gap-2">
                    {active ? (
                      <span className="size-1.5 rounded-full bg-mint" />
                    ) : null}
                    <ArrowUpRight
                      size={18}
                      weight="light"
                      className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              );
            })}
          </nav>
          <ButtonLink
            href={accountHref}
            variant="primary"
            size="lg"
            className="mt-6 w-full"
            onClick={closeMenu}
          >
            {accountLabel}
            <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
