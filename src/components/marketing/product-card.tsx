import Link from "next/link";

import type { MarketingProduct } from "@/lib/marketing";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ProductCover } from "@/components/marketing/product-cover";
import { cn } from "@/lib/utils";

type ProductCardProps = {
  product: MarketingProduct;
  layout?: "carousel" | "grid";
  className?: string;
};

function ArrowGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="size-3.5"
    >
      <path
        d="M4 12 12 4M6 4h6v6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ProductCard({
  product,
  layout = "grid",
  className,
}: ProductCardProps) {
  const available = product.status === "AVAILABLE";
  const href = `/products/${product.slug}`;

  return (
    <article
      className={cn(
        "group flex flex-col rounded-card border border-line bg-bg p-3 transition-all duration-300 hover:-translate-y-1 hover:border-ink/20 hover:shadow-lift",
        layout === "carousel" &&
          "w-[82vw] max-w-[350px] flex-none snap-start sm:w-[calc((100%-1rem)/2)] sm:max-w-none md:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)]",
        layout === "grid" && "h-full",
        className,
      )}
    >
      <div className="relative overflow-hidden rounded-inner">
        <Link href={href} className="block">
          <span className="sr-only">View {product.name}</span>
          <ProductCover
            name={product.name}
            category={product.category}
            version={product.version}
            gradient={product.coverGradient}
            className="aspect-[4/3] transition-transform duration-500 group-hover:scale-[1.02]"
            ariaHidden={false}
          />
        </Link>
        {!available ? (
          <span className="pointer-events-none absolute top-3 right-3 rounded-full border border-white/20 bg-black/20 px-2.5 py-1 text-[8px] font-semibold tracking-[0.14em] text-white/80 uppercase backdrop-blur-sm">
            Soon
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col px-2 pt-5 pb-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[8px] tracking-[0.14em] text-muted uppercase">
            {product.category}
          </span>
          <Badge
            tone={available ? "mint" : "muted"}
            dot
            className="shrink-0"
          >
            {available ? "Available" : "Coming soon"}
          </Badge>
        </div>

        <h3 className="mt-3 font-display text-[19px] leading-tight font-medium tracking-[-0.035em] text-ink">
          <Link
            href={href}
            className="transition-colors hover:text-forest-2"
          >
            {product.name}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-muted">
          {product.tagline}
        </p>

        <div className="mt-auto pt-6">
          <div className="flex items-end justify-between gap-3 border-t border-line pt-4">
            <div>
              <p className="font-mono text-[13px] font-medium tracking-tight text-ink">
                {product.effectivePriceLabel}
              </p>
              {product.compareAtLabel ? (
                <p className="mt-0.5 font-mono text-[9px] text-muted line-through">
                  {product.compareAtLabel}
                </p>
              ) : (
                <p className="mt-0.5 text-[8px] font-semibold tracking-[0.12em] text-muted uppercase">
                  One-time
                </p>
              )}
            </div>

            <ButtonLink
              href={href}
              variant="outline"
              size="sm"
              className="shrink-0"
              aria-label={`${available ? "View kit" : "Preview"} — ${product.name}`}
            >
              {available ? "View kit" : "Preview"}
              <ArrowGlyph />
            </ButtonLink>
          </div>
        </div>
      </div>
    </article>
  );
}
