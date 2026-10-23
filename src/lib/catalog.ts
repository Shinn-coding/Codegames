import { cache } from "react";

import type { CatalogRelease } from "@/config/catalog";
import { catalogSeedProducts } from "@/config/catalog";
import {
  filterAndSortProducts,
  type CatalogQuery,
} from "@/lib/catalog-query";
import { prisma } from "@/lib/db";
import {
  productFromDatabase,
  productFromFallback,
  type MarketingProduct,
} from "@/lib/marketing";

export type CatalogData = {
  products: MarketingProduct[];
  categories: string[];
  query: CatalogQuery;
  availableCount: number;
  totalCount: number;
};

export type ChangelogEntry = CatalogRelease & {
  productName: string;
  productSlug: string;
  category: string;
  coverGradient: string;
  status: "AVAILABLE" | "COMING_SOON";
};

export type ChangelogData = {
  entries: ChangelogEntry[];
  releaseCount: number;
  productCount: number;
};

function logFallback(scope: string, error: unknown) {
  console.error(
    `[catalog] ${scope} is using the static catalog because the database is unavailable.`,
    error instanceof Error ? error.message : "unknown error",
  );
}

async function loadActiveProducts(now: number): Promise<MarketingProduct[]> {
  try {
    const rows = await prisma.product.findMany({
      where: { status: { notIn: ["DRAFT", "ARCHIVED"] } },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
    });

    if (rows.length > 0) {
      return rows.map((product) => productFromDatabase(product, now));
    }
  } catch (error) {
    logFallback("The catalog", error);
  }

  return catalogSeedProducts.map((product) =>
    productFromFallback(product, now),
  );
}

export async function getCatalogData(
  query: CatalogQuery,
): Promise<CatalogData> {
  const products = await loadActiveProducts(Date.now());
  const categories = Array.from(
    new Set(products.map((product) => product.category)),
  ).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));

  return {
    products: filterAndSortProducts(products, query),
    categories,
    query,
    availableCount: products.filter(
      (product) => product.status === "AVAILABLE",
    ).length,
    totalCount: products.length,
  };
}

async function findProduct(slug: string): Promise<MarketingProduct | null> {
  const now = Date.now();

  try {
    const product = await prisma.product.findUnique({ where: { slug } });
    if (
      !product ||
      product.status === "DRAFT" ||
      product.status === "ARCHIVED"
    ) {
      return null;
    }

    return productFromDatabase(product, now);
  } catch (error) {
    logFallback(`The product "${slug}"`, error);
    const fallback = catalogSeedProducts.find(
      (product) => product.slug === slug,
    );
    return fallback ? productFromFallback(fallback, now) : null;
  }
}

export const getProductBySlug = cache(findProduct);

export async function getRelatedProducts(
  product: MarketingProduct,
  limit = 3,
): Promise<MarketingProduct[]> {
  const products = await loadActiveProducts(Date.now());
  const others = products.filter((candidate) => candidate.slug !== product.slug);
  const sameCategory = others.filter(
    (candidate) => candidate.category === product.category,
  );
  const rest = others.filter(
    (candidate) => candidate.category !== product.category,
  );

  return [...sameCategory, ...rest].slice(0, limit);
}

export async function getChangelogData(): Promise<ChangelogData> {
  const products = await loadActiveProducts(Date.now());
  const entries = products
    .flatMap((product) =>
      product.changelog.map((release) => ({
        ...release,
        productName: product.name,
        productSlug: product.slug,
        category: product.category,
        coverGradient: product.coverGradient,
        status: product.status,
      })),
    )
    .sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime() ||
        a.productName.localeCompare(b.productName, "en", {
          sensitivity: "base",
        }),
    );

  return {
    entries,
    releaseCount: entries.length,
    productCount: products.filter((product) => product.changelog.length > 0)
      .length,
  };
}
