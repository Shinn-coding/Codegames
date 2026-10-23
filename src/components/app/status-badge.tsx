import Link from "next/link";

import { Badge } from "@/components/ui/badge";

const tones: Record<string, "mint" | "amber" | "muted" | "line" | "dark"> = {
  PAID: "mint",
  ACTIVE: "mint",
  AVAILABLE: "mint",
  PENDING: "amber",
  COMING_SOON: "line",
  DRAFT: "line",
  REFUNDED: "line",
  EXPIRED: "muted",
  FAILED: "muted",
  REVOKED: "muted",
  ARCHIVED: "muted",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={tones[status] ?? "line"} dot>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}

export function Pagination({
  basePath,
  page,
  pageCount,
  params,
}: {
  basePath: string;
  page: number;
  pageCount: number;
  params: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) {
    return null;
  }

  function hrefFor(target: number) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        query.set(key, value);
      }
    }
    if (target > 1) {
      query.set("page", String(target));
    }
    const suffix = query.toString();
    return suffix ? `${basePath}?${suffix}` : basePath;
  }

  const linkClass =
    "inline-flex h-9 items-center rounded-full border border-line bg-surface px-4 text-[11px] font-semibold text-ink/70 transition-colors hover:border-ink/20 hover:text-ink";

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-3 pt-2"
    >
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={linkClass}>
          Previous
        </Link>
      ) : (
        <span />
      )}
      <p className="font-mono text-[10px] tracking-[0.08em] text-muted uppercase">
        Page {page} / {pageCount}
      </p>
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={linkClass}>
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
