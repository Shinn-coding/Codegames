import assert from "node:assert/strict";
import test from "node:test";

import {
  parseChangelogInput,
  parseDateTimeLocal,
  parseIntegerInput,
  parseLines,
  parsePriceInput,
  parseProductForm,
  parseSettingsForm,
  toDateTimeLocalValue,
} from "../src/lib/admin-core.ts";

test("parses rupiah amounts the way admins type them", () => {
  assert.equal(parsePriceInput("1099000"), 1_099_000);
  assert.equal(parsePriceInput("1.099.000"), 1_099_000);
  assert.equal(parsePriceInput("Rp 1.099.000"), 1_099_000);
  assert.equal(parsePriceInput(" 629,000 "), 629_000);
  assert.equal(parsePriceInput("0"), 0);
});

test("rejects malformed prices", () => {
  assert.equal(parsePriceInput(""), null);
  assert.equal(parsePriceInput("abc"), null);
  assert.equal(parsePriceInput("12x34"), null);
  assert.equal(parsePriceInput("-5000"), null);
});

test("parses integers and normalizes lines", () => {
  assert.equal(parseIntegerInput("42"), 42);
  assert.equal(parseIntegerInput("4.2"), null);
  assert.deepEqual(
    parseLines(" one \n\ntwo\none\nthree \n", 2),
    ["one", "two"],
  );
});

test("validates changelog JSON and reports the failing path", () => {
  const valid = parseChangelogInput(
    JSON.stringify([
      { version: "1.0.0", date: "2026-10-22", title: "Launch", notes: ["Hi"] },
    ]),
  );

  assert.equal(valid.ok, true);
  assert.equal(valid.ok && valid.value.length, 1);

  assert.deepEqual(parseChangelogInput("   "), { ok: true, value: [] });
  assert.equal(parseChangelogInput("{").ok, false);

  const wrongDate = parseChangelogInput(
    JSON.stringify([
      { version: "1.0.0", date: "22-10-2026", title: "Launch", notes: [] },
    ]),
  );

  assert.equal(wrongDate.ok, false);
});

test("round-trips a local datetime value", () => {
  const date = new Date(2026, 9, 22, 14, 30);
  const value = toDateTimeLocalValue(date);

  assert.equal(value, "2026-10-22T14:30");
  assert.equal(parseDateTimeLocal(value)?.getTime(), date.getTime());
  assert.equal(parseDateTimeLocal(""), null);
  assert.equal(parseDateTimeLocal("2026-13-99T99:99"), null);
});

function productForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  const values: Record<string, string> = {
    name: "Test Kit",
    slug: "test-kit",
    tagline: "A test kit that ships fast.",
    description: "A complete description that is definitely long enough.",
    category: "Boilerplate",
    status: "DRAFT",
    priceIdr: "1.099.000",
    earlyBirdPriceIdr: "",
    earlyBirdEndsAt: "",
    licenseType: "personal",
    version: "1.0.0",
    coverGradient: "mint",
    demoUrl: "",
    sortOrder: "3",
    features: "Typed APIs\nPrivate storage",
    stack: "Next.js\nPrisma",
    changelog: "[]",
    ...overrides,
  };

  for (const [key, value] of Object.entries(values)) {
    form.set(key, value);
  }

  return form;
}

test("parses a complete product form", () => {
  const result = parseProductForm(productForm());

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.value.priceIdr, 1_099_000);
  assert.equal(result.value.sortOrder, 3);
  assert.deepEqual(result.value.features, ["Typed APIs", "Private storage"]);
  assert.equal(result.value.coverGradient, "mint");
  assert.equal(result.value.demoUrl, null);
  assert.deepEqual(result.value.changelog, []);
});

test("reports product form field errors without throwing", () => {
  const result = parseProductForm(
    productForm({
      priceIdr: "not a price",
      slug: "Not A Slug",
      changelog: "{",
      version: "v1",
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }

  assert.ok(result.errors.priceIdr);
  assert.ok(result.errors.slug);
  assert.ok(result.errors.changelog);
  assert.ok(result.errors.version);
});

test("validates settings and the featured slug", () => {
  const form = new FormData();
  form.set("statsLicenses", "10,000+");
  form.set("statsGmv", "$5M+");
  form.set("statsUptime", "99.9%");
  form.set("headline", "Next Generation of Production-Ready Code");
  form.set(
    "subheadline",
    "Buy battle-tested source code, boilerplates, and developer kits.",
  );
  form.set("featuredSlug", "launch-kit-bundle");
  form.set("featuredEndsAt", "2026-11-01T10:00");
  form.set("announcement", "Early-bird pricing is live.");

  const valid = parseSettingsForm(form, ["launch-kit-bundle"]);
  assert.equal(valid.ok, true);

  form.set("featuredSlug", "does-not-exist");
  const invalid = parseSettingsForm(form, ["launch-kit-bundle"]);
  assert.equal(invalid.ok, false);
  assert.ok(!invalid.ok && invalid.errors.featuredSlug);
});
