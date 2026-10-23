import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  action?: ReactNode;
  className?: string;
  titleClassName?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  action,
  className,
  titleClassName,
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "flex flex-col gap-6 md:flex-row md:items-end md:justify-between",
        centered && "md:flex-col md:items-center md:text-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", centered && "mx-auto")}>
        {eyebrow ? (
          <div
            className={cn(
              "mb-5 flex items-center gap-3 text-[10px] font-semibold tracking-[0.22em] text-muted uppercase",
              centered && "justify-center",
            )}
          >
            <span aria-hidden="true" className="h-px w-8 bg-ink/20" />
            {eyebrow}
          </div>
        ) : null}
        <h2
          className={cn(
            "font-display text-[clamp(2.25rem,5vw,4.25rem)] leading-[0.98] font-semibold tracking-[-0.055em] text-ink",
            titleClassName,
          )}
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
