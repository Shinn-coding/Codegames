import assert from "node:assert/strict";
import test from "node:test";

import {
  filterAndSortProducts,
  parseCatalogQuery,
  type CatalogSortable,
} from "../src/lib/catalog-query.ts";

const products: CatalogSortable[] = [
  {
    name: "Zeta Kit",
    category: "Tooling",
    featured: false,
    effectivePriceIdr: 899_000,
    sortOrder: 3,
  },
  {
    name: "Alpha Kit",
    category: "Payments",
    featured: false,
    effectivePriceIdr: 299_000,
    sortOrder: 2,
  },
  {
    name: "Bundle",
    category: "Bundle",
    featured: true,
    effectivePriceIdr: 1_599_000,
    sortOrder: 0,
  },
  {
    name: "Beta Kit",
    category: "Tooling",
    featured: false,
    effectivePriceIdr: 299_000,
    sortOrder: 1,
  },
];

test("normalizes empty and unknown catalog query values", () => {
  assert.deepEqual(parseCatalogQuery({}), {
    category: null,
    sort: "featured",
  });
  assert.deepEqual(parseCatalogQuery({ category: "all", sort: "newest" }), {
    category: null,
    sort: "featured",
  });
  assert.deepEqual(
    parseCatalogQuery({ category: " Tooling ", sort: "price-asc" }),
    {
      category: "Tooling",
      sort: "price-asc",
    },
  );
});

test("reads the first value when a query parameter repeats", () => {
  assert.deepEqual(
    parseCatalogQuery({
      category: ["Payments", "Tooling"],
      sort: ["name", "price-desc"],
    }),
    {
      category: "Payments",
      sort: "name",
    },
  );
});

test("filters by category without mutating the source collection", () => {
  const result = filterAndSortProducts(products, {
    category: "Tooling",
    sort: "featured",
  });

  assert.deepEqual(
    result.map((product) => product.name),
    ["Beta Kit", "Zeta Kit"],
  );
  assert.equal(products.length, 4);
});

test("sorts featured products first, then by sort order", () => {
  const result = filterAndSortProducts(products, {
    category: null,
    sort: "featured",
  });

  assert.deepEqual(
    result.map((product) => product.name),
    ["Bundle", "Beta Kit", "Alpha Kit", "Zeta Kit"],
  );
});

test("sorts by effective price with a stable sort-order tie break", () => {
  const ascending = filterAndSortProducts(products, {
    category: null,
    sort: "price-asc",
  });
  const descending = filterAndSortProducts(products, {
    category: null,
    sort: "price-desc",
  });

  assert.deepEqual(
    ascending.map((product) => product.name),
    ["Beta Kit", "Alpha Kit", "Zeta Kit", "Bundle"],
  );
  assert.deepEqual(
    descending.map((product) => product.name),
    ["Bundle", "Zeta Kit", "Beta Kit", "Alpha Kit"],
  );
});

test("sorts alphabetically by name", () => {
  const result = filterAndSortProducts(products, {
    category: null,
    sort: "name",
  });

  assert.deepEqual(
    result.map((product) => product.name),
    ["Alpha Kit", "Beta Kit", "Bundle", "Zeta Kit"],
  );
});
