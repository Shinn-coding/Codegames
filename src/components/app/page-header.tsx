import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-3 font-display text-[clamp(2rem,4.4vw,3.2rem)] leading-[0.96] font-semibold tracking-[-0.055em] text-ink">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_0_rgba(22,36,31,0.03)]">
      <p className="text-[9px] font-semibold tracking-[0.18em] text-muted uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-[26px] leading-none font-semibold tracking-[-0.03em] text-ink",
          mono && "font-mono text-[22px] tracking-tight",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-[11px] leading-5 text-muted">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface/60 p-8">
      <p className="font-display text-xl font-semibold tracking-[-0.03em] text-ink">
        {title}
      </p>
      <p className="mt-2 max-w-lg text-sm leading-7 text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  action,
  id,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2
          id={id}
          className="font-display text-[22px] leading-tight font-semibold tracking-[-0.04em] text-ink"
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-1.5 text-[12px] leading-6 text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
