"use client";

import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import type { MarketingProduct } from "@/lib/marketing";
import { ProductCard } from "@/components/marketing/product-card";

type ProductCarouselProps = {
  products: MarketingProduct[];
};

export function ProductCarousel({ products }: ProductCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: true });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return;
    }

    const update = () => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      setCanScroll({
        left: track.scrollLeft > 4,
        right: maxScroll > 4 && track.scrollLeft < maxScroll - 4,
      });
    };

    update();
    track.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(track);

    return () => {
      track.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  const scrollByPage = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    track.scrollBy({
      left: direction * track.clientWidth * 0.82,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  if (products.length === 0) {
    return (
      <p className="rounded-card border border-line bg-bg p-8 text-sm text-muted">
        The next drop is being prepared. Check back soon.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="font-mono text-[9px] tracking-[0.16em] text-muted uppercase">
          {products.length} kits · {products.filter((product) => product.status === "AVAILABLE").length} available now
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            disabled={!canScroll.left}
            aria-label="Scroll products left"
            aria-controls="product-track"
            className="grid size-9 place-items-center rounded-full border border-line bg-bg text-ink transition-colors hover:bg-ink hover:text-bg disabled:pointer-events-none disabled:opacity-30"
          >
            <ArrowLeft size={15} weight="light" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            disabled={!canScroll.right}
            aria-label="Scroll products right"
            aria-controls="product-track"
            className="grid size-9 place-items-center rounded-full border border-line bg-bg text-ink transition-colors hover:bg-ink hover:text-bg disabled:pointer-events-none disabled:opacity-30"
          >
            <ArrowRight size={15} weight="light" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        id="product-track"
        ref={trackRef}
        role="region"
        aria-label="Product carousel"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            scrollByPage(event.key === "ArrowRight" ? 1 : -1);
          }
        }}
        className="hide-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            layout="carousel"
          />
        ))}
      </div>

      <p className="mt-6 flex items-center gap-2 text-[10px] tracking-[0.08em] text-muted">
        <span aria-hidden="true" className="h-px w-8 bg-ink/15" />
        All licenses include source code, documentation, and lifetime updates.
      </p>
    </div>
  );
}
