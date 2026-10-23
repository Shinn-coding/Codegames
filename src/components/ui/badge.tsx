import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type BadgeTone = "mint" | "line" | "dark" | "amber" | "muted";

const toneClasses: Record<BadgeTone, string> = {
  mint: "border-mint/30 bg-mint/15 text-forest",
  line: "border-line bg-surface text-ink/70",
  dark: "border-white/15 bg-white/10 text-bg",
  amber: "border-amber/25 bg-amber/15 text-[#76560e]",
  muted: "border-line bg-transparent text-muted",
};

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
};

export function Badge({
  children,
  tone = "line",
  dot = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold tracking-[0.16em] uppercase",
        toneClasses[tone],
        className,
      )}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 rounded-full",
            tone === "mint" ? "bg-forest" : "bg-current opacity-60",
          )}
        />
      ) : null}
      {children}
    </span>
  );
}
