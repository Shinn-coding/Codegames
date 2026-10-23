import Link from "next/link";

import { cn } from "@/lib/utils";

type LogoProps = {
  tone?: "light" | "dark";
  className?: string;
};

export function Logo({ tone = "dark", className }: LogoProps) {
  const light = tone === "light";

  return (
    <Link
      href="/"
      aria-label="CodeGems home"
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <span
        className={cn(
          "grid size-9 place-items-center rounded-[12px] border transition-transform duration-300 group-hover:-rotate-6",
          light
            ? "border-mint/40 bg-mint text-forest"
            : "border-ink/10 bg-forest text-mint",
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="size-[19px]"
        >
          <path
            d="M12 2.75 21 8.5 12 21.25 3 8.5 12 2.75Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M3.4 8.5h17.2M12 3v18.1M7.4 8.5 12 21.1l4.6-12.6"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity=".55"
          />
        </svg>
      </span>
      <span
        className={cn(
          "font-display text-[19px] font-semibold tracking-[-0.045em]",
          light ? "text-bg" : "text-ink",
        )}
      >
        CodeGems
      </span>
    </Link>
  );
}
