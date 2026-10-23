import { ArrowDownRight } from "@phosphor-icons/react/ssr";

import type { MarketingProduct } from "@/lib/marketing";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProductCarousel } from "@/components/marketing/product-carousel";

type ProductsSectionProps = {
  products: MarketingProduct[];
};

export function ProductsSection({ products }: ProductsSectionProps) {
  return (
    <section id="products" className="bg-surface py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="The shelf"
            title={
              <>
                Kits that remove
                <br />
                <span className="text-muted">the first two weeks.</span>
              </>
            }
            description="Production-ready foundations for the parts every product needs — auth, payments, licensing, and delivery. Pick one, or take the whole shelf."
            action={
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <span className="font-mono text-[9px] tracking-[0.16em] text-muted uppercase">
                  Prices in IDR
                </span>
                <ButtonLink
                  href="/products/launch-kit-bundle"
                  variant="primary"
                  size="md"
                >
                  Get the bundle
                  <ArrowDownRight size={15} weight="bold" aria-hidden="true" />
                </ButtonLink>
              </div>
            }
          />
        </Reveal>

        <div className="mt-12">
          <ProductCarousel products={products} />
        </div>
      </div>
    </section>
  );
}
