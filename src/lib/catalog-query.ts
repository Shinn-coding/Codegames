export const CATALOG_SORTS = [
  "featured",
  "price-asc",
  "price-desc",
  "name",
] as const;

export type CatalogSort = (typeof CATALOG_SORTS)[number];

export const CATALOG_SORT_OPTIONS: ReadonlyArray<{
  value: CatalogSort;
  label: string;
}> = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name: A to Z" },
];

export type CatalogQuery = {
  category: string | null;
  sort: CatalogSort;
};

export type CatalogQueryInput = {
  category?: string | string[];
  sort?: string | string[];
};

export type CatalogSortable = {
  name: string;
  category: string;
  featured: boolean;
  effectivePriceIdr: number;
  sortOrder: number;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isCatalogSort(value: string | undefined): value is CatalogSort {
  return CATALOG_SORTS.includes(value as CatalogSort);
}

/**
 * Normalize untrusted URL search params into an allow-listed catalog query.
 * Unknown sort values fall back to the default instead of reaching the sorter.
 */
export function parseCatalogQuery(input: CatalogQueryInput): CatalogQuery {
  const category = first(input.category)?.trim() ?? "";
  const sort = first(input.sort);

  return {
    category: category && category.toLowerCase() !== "all" ? category : null,
    sort: isCatalogSort(sort) ? sort : "featured",
  };
}

export function filterAndSortProducts<T extends CatalogSortable>(
  products: readonly T[],
  query: CatalogQuery,
): T[] {
  const filtered = query.category
    ? products.filter((product) => product.category === query.category)
    : [...products];

  return filtered.sort((a, b) => {
    switch (query.sort) {
      case "price-asc":
        return (
          a.effectivePriceIdr - b.effectivePriceIdr ||
          a.sortOrder - b.sortOrder
        );
      case "price-desc":
        return (
          b.effectivePriceIdr - a.effectivePriceIdr ||
          a.sortOrder - b.sortOrder
        );
      case "name":
        return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
      case "featured":
      default:
        return (
          Number(b.featured) - Number(a.featured) ||
          a.sortOrder - b.sortOrder ||
          a.name.localeCompare(b.name, "en", { sensitivity: "base" })
        );
    }
  });
}
