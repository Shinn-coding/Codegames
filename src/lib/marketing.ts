import type { Product, ProductStatus } from "@prisma/client";
import { z } from "zod";

import {
  catalogSeedProducts,
  catalogSeedSettings,
  type CatalogRelease,
  type CatalogSeedProduct,
} from "@/config/catalog";
import { siteConfig } from "@/config/site";
import { formatIdr } from "@/lib/format";
import { prisma } from "@/lib/db";
import { getEffectivePrice } from "@/lib/pricing";

export type MarketingProduct = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  features: string[];
  stack: string[];
  changelog: CatalogRelease[];
  category: string;
  status: "AVAILABLE" | "COMING_SOON";
  priceIdr: number;
  effectivePriceIdr: number;
  earlyBirdPriceIdr: number | null;
  earlyBirdEndsAt: string | null;
  earlyBirdActive: boolean;
  earlyBirdSeconds: number;
  licenseType: string;
  version: string;
  coverGradient: string;
  demoUrl: string | null;
  featured: boolean;
  sortOrder: number;
  priceLabel: string;
  effectivePriceLabel: string;
  compareAtLabel: string | null;
};

export type LandingSettings = {
  licenses: string;
  gmv: string;
  uptime: string;
  headline: string;
  subheadline: string;
  featuredSlug: string;
  featuredEndsAt: string | null;
  announcement: string;
};

export type LandingData = {
  settings: LandingSettings;
  featured: MarketingProduct | null;
  featuredSeconds: number;
  products: MarketingProduct[];
};

const releaseSchema = z.object({
  version: z.string().min(1),
  date: z.string().min(1),
  title: z.string().min(1),
  notes: z.array(z.string()),
});

const releaseListSchema = z.array(releaseSchema);

const defaultSettings: LandingSettings = {
  licenses: siteConfig.stats.licenses,
  gmv: siteConfig.stats.gmv,
  uptime: siteConfig.stats.uptime,
  headline: siteConfig.hero.headline,
  subheadline: siteConfig.hero.subheadline,
  featuredSlug: "launch-kit-bundle",
  featuredEndsAt: catalogSeedSettings["featured.endsAt"],
  announcement: catalogSeedSettings.announcement,
};

function displayStatus(status: ProductStatus): "AVAILABLE" | "COMING_SOON" {
  return status === "AVAILABLE" ? "AVAILABLE" : "COMING_SOON";
}

/**
 * JSON columns are untrusted input. Keep only release entries that match the
 * public changelog contract so a malformed admin edit cannot break the page.
 */
export function parseReleases(value: unknown): CatalogRelease[] {
  const parsed = releaseListSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

function buildProduct(
  base: Omit<
    MarketingProduct,
    | "effectivePriceIdr"
    | "earlyBirdActive"
    | "earlyBirdSeconds"
    | "priceLabel"
    | "effectivePriceLabel"
    | "compareAtLabel"
  >,
  now: number,
): MarketingProduct {
  const pricing = getEffectivePrice(
    {
      priceIdr: base.priceIdr,
      earlyBirdPriceIdr: base.earlyBirdPriceIdr,
      earlyBirdEndsAt: base.earlyBirdEndsAt,
    },
    now,
  );

  return {
    ...base,
    changelog: [...base.changelog].sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime() ||
        b.version.localeCompare(a.version, "en", { numeric: true }),
    ),
    earlyBirdActive: pricing.earlyBirdActive,
    earlyBirdSeconds: pricing.earlyBirdSeconds,
    effectivePriceIdr: pricing.effectivePriceIdr,
    priceLabel: formatIdr(base.priceIdr),
    effectivePriceLabel: formatIdr(pricing.effectivePriceIdr),
    compareAtLabel:
      pricing.compareAtIdr === null ? null : formatIdr(pricing.compareAtIdr),
  };
}

export function productFromDatabase(
  product: Product,
  now: number,
): MarketingProduct {
  return buildProduct(
    {
      id: product.id,
      slug: product.slug,
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      features: product.features,
      stack: product.stack,
      changelog: parseReleases(product.changelog),
      category: product.category,
      status: displayStatus(product.status),
      priceIdr: product.priceIdr,
      earlyBirdPriceIdr: product.earlyBirdPriceIdr,
      earlyBirdEndsAt: product.earlyBirdEndsAt?.toISOString() ?? null,
      licenseType: product.licenseType,
      version: product.version,
      coverGradient: product.coverGradient ?? "mint",
      demoUrl: product.demoUrl,
      featured: product.featured,
      sortOrder: product.sortOrder,
    },
    now,
  );
}

export function productFromFallback(
  product: CatalogSeedProduct,
  now: number,
): MarketingProduct {
  return buildProduct(
    {
      id: product.slug,
      slug: product.slug,
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      features: product.features,
      stack: product.stack,
      changelog: product.changelog,
      category: product.category,
      status: product.status,
      priceIdr: product.priceIdr,
      earlyBirdPriceIdr: product.earlyBirdPriceIdr,
      earlyBirdEndsAt: product.earlyBirdEndsAt,
      licenseType: product.licenseType,
      version: product.version,
      coverGradient: product.coverGradient,
      demoUrl: product.demoUrl,
      featured: product.featured,
      sortOrder: product.sortOrder,
    },
    now,
  );
}

function withDeadline(
  product: MarketingProduct,
  deadline: string | null,
  now: number,
): MarketingProduct {
  if (!deadline) {
    return product;
  }

  return buildProduct(
    {
      ...product,
      earlyBirdEndsAt: deadline,
    },
    now,
  );
}

function secondsUntil(deadline: string | null, now: number): number {
  if (!deadline) {
    return 0;
  }
  const timestamp = new Date(deadline).getTime();
  if (Number.isNaN(timestamp)) {
    return 0;
  }
  return Math.max(0, Math.floor((timestamp - now) / 1000));
}

function fallbackProducts(now: number): MarketingProduct[] {
  return catalogSeedProducts
    .slice()
    .sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) || a.sortOrder - b.sortOrder,
    )
    .map((product) => productFromFallback(product, now));
}

function fallbackData(now: number): LandingData {
  const products = fallbackProducts(now);

  const featured =
    products.find((product) => product.slug === defaultSettings.featuredSlug) ??
    products.find((product) => product.featured) ??
    products[0] ??
    null;

  return {
    settings: defaultSettings,
    featured,
    featuredSeconds: secondsUntil(defaultSettings.featuredEndsAt, now),
    products: products.filter((product) => product.slug !== featured?.slug),
  };
}

function readSettings(rows: Array<{ key: string; value: string }>): LandingSettings {
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));

  return {
    licenses: values["stats.licenses"] ?? defaultSettings.licenses,
    gmv: values["stats.gmv"] ?? defaultSettings.gmv,
    uptime: values["stats.uptime"] ?? defaultSettings.uptime,
    headline: values["hero.headline"] ?? defaultSettings.headline,
    subheadline: values["hero.subheadline"] ?? defaultSettings.subheadline,
    featuredSlug: values["featured.slug"] ?? defaultSettings.featuredSlug,
    featuredEndsAt:
      values["featured.endsAt"] ?? defaultSettings.featuredEndsAt,
    announcement: values.announcement ?? defaultSettings.announcement,
  };
}

export async function getMarketingSettings(): Promise<LandingSettings> {
  try {
    const rows = await prisma.setting.findMany();
    return readSettings(rows);
  } catch (error) {
    console.error(
      "[marketing] Falling back to static settings because the database is unavailable.",
      error instanceof Error ? error.message : "unknown error",
    );
    return defaultSettings;
  }
}

export async function getLandingData(): Promise<LandingData> {
  const now = Date.now();

  try {
    const [productRows, settingRows] = await Promise.all([
      prisma.product.findMany({
        where: { status: { notIn: ["DRAFT", "ARCHIVED"] } },
        orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
      }),
      prisma.setting.findMany(),
    ]);

    const settings = readSettings(settingRows);
    const products =
      productRows.length > 0
        ? productRows.map((product) => productFromDatabase(product, now))
        : fallbackProducts(now);

    const featured =
      products.find((product) => product.slug === settings.featuredSlug) ??
      products.find((product) => product.featured) ??
      products[0] ??
      null;

    const featuredWithDeadline = featured
      ? withDeadline(featured, settings.featuredEndsAt, now)
      : null;

    return {
      settings,
      featured: featuredWithDeadline,
      featuredSeconds: secondsUntil(settings.featuredEndsAt, now),
      products: products.filter(
        (product) => product.slug !== featuredWithDeadline?.slug,
      ),
    };
  } catch (error) {
    console.error(
      "[marketing] Falling back to static catalog because the database is unavailable.",
      error instanceof Error ? error.message : "unknown error",
    );
    return fallbackData(now);
  }
}
