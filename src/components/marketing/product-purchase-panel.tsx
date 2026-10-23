import {
  ArrowUpRight,
  DownloadSimple,
  ShieldCheck,
} from "@phosphor-icons/react/ssr";

import type { MarketingProduct } from "@/lib/marketing";
import { siteConfig } from "@/config/site";
import { Button, ButtonLink } from "@/components/ui/button";
import { CheckoutButton } from "@/components/checkout/checkout-button";
import { Countdown } from "@/components/marketing/countdown";
import { ProductCover } from "@/components/marketing/product-cover";

type ProductPurchasePanelProps = {
  product: MarketingProduct;
  isSignedIn: boolean;
};

export function ProductPurchasePanel({
  product,
  isSignedIn,
}: ProductPurchasePanelProps) {
  const available = product.status === "AVAILABLE";
  const loginHref = `/login?callbackUrl=${encodeURIComponent(
    `/products/${product.slug}`,
  )}`;
  const notifyHref = `mailto:${siteConfig.supportEmail}?subject=${encodeURIComponent(
    `Notify me about ${product.name}`,
  )}`;

  return (
    <aside aria-label={`${product.name} license`} className="lg:sticky lg:top-32">
      <div className="rounded-card border border-line bg-surface p-3 shadow-soft">
        <ProductCover
          name={product.name}
          category={product.category}
          version={product.version}
          gradient={product.coverGradient}
          className="aspect-[4/3]"
        />

        <div className="p-4 pt-6 sm:p-5 sm:pt-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[9px] font-semibold tracking-[0.16em] text-muted uppercase">
                One-time license
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-mono text-[26px] font-medium tracking-tight text-ink">
                  {product.effectivePriceLabel}
                </span>
                {product.compareAtLabel ? (
                  <span className="font-mono text-xs text-muted line-through">
                    {product.compareAtLabel}
                  </span>
                ) : null}
              </div>
            </div>
            <span className="rounded-full border border-line px-2.5 py-1 text-[8px] font-semibold tracking-[0.14em] text-muted uppercase">
              IDR
            </span>
          </div>

          {product.earlyBirdActive ? (
            <Countdown
              deadline={product.earlyBirdEndsAt}
              initialSeconds={product.earlyBirdSeconds}
              tone="dark"
              label="Early-bird ends in"
              className="mt-4"
            />
          ) : null}

          <dl className="mt-5 space-y-3 border-t border-line pt-5 text-[11px]">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">License</dt>
              <dd className="font-medium text-ink">
                {product.licenseType === "bundle"
                  ? "Bundle · personal"
                  : "Personal"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Delivery</dt>
              <dd className="font-medium text-ink">Instant download</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Updates</dt>
              <dd className="font-medium text-ink">Lifetime</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Version</dt>
              <dd className="font-mono text-ink">v{product.version}</dd>
            </div>
          </dl>

          {available ? (
            isSignedIn ? (
              <CheckoutButton slug={product.slug} />
            ) : (
              <>
                <ButtonLink
                  href={loginHref}
                  size="lg"
                  className="mt-6 w-full"
                >
                  Sign in to buy
                  <ArrowUpRight
                    size={15}
                    weight="bold"
                    aria-hidden="true"
                  />
                </ButtonLink>
                <p className="mt-3 text-center text-[10px] leading-5 text-muted">
                  Create an account to purchase, download, and receive updates.
                </p>
              </>
            )
          ) : (
            <>
              <Button
                size="lg"
                className="mt-6 w-full"
                disabled
                aria-describedby="coming-soon-note"
              >
                Coming soon
              </Button>
              <p
                id="coming-soon-note"
                className="mt-3 text-center text-[10px] leading-5 text-muted"
              >
                This kit is not available for purchase yet.
              </p>
              <a
                href={notifyHref}
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 text-[11px] font-semibold text-forest transition-colors hover:text-ink"
              >
                Notify me when it launches
                <ArrowUpRight size={12} weight="bold" aria-hidden="true" />
              </a>
            </>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-line pt-4 text-[9px] tracking-[0.08em] text-muted uppercase">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={12} weight="light" aria-hidden="true" />
              Secure license
            </span>
            <span className="inline-flex items-center gap-1.5">
              <DownloadSimple size={12} weight="light" aria-hidden="true" />
              Source included
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
