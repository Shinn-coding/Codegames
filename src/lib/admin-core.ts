import { z } from "zod";

import type { CatalogRelease } from "@/config/catalog";

export const PRODUCT_STATUSES = [
  "DRAFT",
  "AVAILABLE",
  "COMING_SOON",
  "ARCHIVED",
] as const;

export type ProductStatusValue = (typeof PRODUCT_STATUSES)[number];

export const COVER_GRADIENTS = [
  "mint",
  "amber",
  "sky",
  "sage",
  "clay",
  "slate",
  "emerald",
] as const;

export type CoverGradientValue = (typeof COVER_GRADIENTS)[number];

const releaseSchema = z.object({
  version: z.string().trim().min(1, "Every release needs a version.").max(40),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Release dates use YYYY-MM-DD."),
  title: z.string().trim().min(1, "Every release needs a title.").max(140),
  notes: z.array(z.string().trim().min(1).max(300)).max(20),
});

export const changelogSchema = z.array(releaseSchema).max(50);

export type ProductFormValues = {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: string;
  status: ProductStatusValue;
  priceIdr: number;
  earlyBirdPriceIdr: number | null;
  earlyBirdEndsAt: Date | null;
  licenseType: string;
  version: string;
  coverGradient: CoverGradientValue | null;
  demoUrl: string | null;
  featured: boolean;
  sortOrder: number;
  features: string[];
  stack: string[];
  changelog: CatalogRelease[];
};

export type FormParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> };

function fieldErrors(issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>) {
  const errors: Record<string, string> = {};

  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in errors)) {
      errors[key] = issue.message;
    }
  }

  return errors;
}

/**
 * Prices are typed by hand in the admin UI. Accept the shapes people actually
 * write (`1.099.000`, `Rp 1.099.000`, `1099000`) and reject anything with a
 * non-digit left over.
 */
export function parsePriceInput(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/^rp\.?/i, "")
    .replace(/[\s.,]/g, "");

  if (cleaned.length === 0 || !/^\d+$/.test(cleaned)) {
    return null;
  }

  const value = Number(cleaned);
  return Number.isSafeInteger(value) ? value : null;
}

export function parseIntegerInput(raw: string): number | null {
  const cleaned = raw.trim();
  return /^\d+$/.test(cleaned) ? Number(cleaned) : null;
}

export function parseLines(raw: string, maxItems: number): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];

  for (const line of raw.split(/\r?\n/)) {
    const value = line.trim();
    if (value.length === 0 || seen.has(value)) {
      continue;
    }
    seen.add(value);
    lines.push(value);
    if (lines.length >= maxItems) {
      break;
    }
  }

  return lines;
}

export function parseLinesField(
  raw: string,
  maxItems: number,
): { ok: true; value: string[] } | { ok: false; message: string } {
  const lines = parseLines(raw, maxItems + 1);

  if (lines.length > maxItems) {
    return { ok: false, message: `Use at most ${maxItems} entries.` };
  }

  const tooLong = lines.find((line) => line.length > 160);
  if (tooLong) {
    return { ok: false, message: "Each entry must be 160 characters or fewer." };
  }

  return { ok: true, value: lines };
}

export function parseChangelogInput(
  raw: string,
): { ok: true; value: CatalogRelease[] } | { ok: false; message: string } {
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return { ok: true, value: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, message: "Changelog must be valid JSON." };
  }

  const result = changelogSchema.safeParse(parsed);

  if (!result.success) {
    const first = result.error.issues[0];
    return {
      ok: false,
      message: first
        ? `${first.path.join(".") || "changelog"}: ${first.message}`
        : "Changelog is not valid.",
    };
  }

  return { ok: true, value: result.data };
}

export function toDateTimeLocalValue(value: Date | null): string {
  if (!value) {
    return "";
  }

  const pad = (part: number) => String(part).padStart(2, "0");

  return [
    `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`,
    `${pad(value.getHours())}:${pad(value.getMinutes())}`,
  ].join("T");
}

export function parseDateTimeLocal(raw: string): Date | null {
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(trimmed)) {
    return null;
  }

  const value = new Date(trimmed);
  return Number.isNaN(value.getTime()) ? null : value;
}

const productFormSchema = z.object({
  name: z.string().trim().min(2, "Name is too short.").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Slug is too short.")
    .max(80)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and single hyphens.",
    ),
  tagline: z.string().trim().min(8, "Tagline is too short.").max(200),
  description: z.string().trim().min(20, "Description is too short.").max(8000),
  category: z.string().trim().min(2, "Category is required.").max(60),
  status: z.enum(PRODUCT_STATUSES),
  priceIdr: z
    .number()
    .int("Price must be a whole rupiah amount.")
    .min(0, "Price cannot be negative.")
    .max(1_000_000_000, "Price is too large."),
  earlyBirdPriceIdr: z
    .number()
    .int("Early-bird price must be a whole rupiah amount.")
    .min(0, "Early-bird price cannot be negative.")
    .max(1_000_000_000, "Early-bird price is too large.")
    .nullable(),
  earlyBirdEndsAt: z.date().nullable(),
  licenseType: z.string().trim().min(2, "License type is required.").max(40),
  version: z
    .string()
    .trim()
    .regex(
      /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/,
      "Use a version such as 1.2.0.",
    ),
  coverGradient: z.enum(COVER_GRADIENTS).nullable(),
  demoUrl: z.url("Demo URL must be a full URL.").nullable(),
  featured: z.boolean(),
  sortOrder: z
    .number()
    .int("Sort order must be a whole number.")
    .min(0)
    .max(9999),
  features: z.array(z.string().min(1).max(160)).max(12),
  stack: z.array(z.string().min(1).max(40)).max(12),
  changelog: changelogSchema,
});

/**
 * Parse and validate the admin product form. Field errors are keyed by input
 * `name` so the client form can render them next to the right control.
 */
export function parseProductForm(formData: FormData): FormParseResult<ProductFormValues> {
  const errors: Record<string, string> = {};

  const rawPrice = String(formData.get("priceIdr") ?? "");
  const priceIdr = parsePriceInput(rawPrice);

  if (priceIdr === null) {
    errors.priceIdr = "Enter a whole rupiah amount, for example 1099000.";
  }

  const rawEarlyBird = String(formData.get("earlyBirdPriceIdr") ?? "");
  const earlyBirdPriceIdr =
    rawEarlyBird.trim().length === 0 ? null : parsePriceInput(rawEarlyBird);

  if (rawEarlyBird.trim().length > 0 && earlyBirdPriceIdr === null) {
    errors.earlyBirdPriceIdr = "Enter a whole rupiah amount or leave it empty.";
  }

  const rawEndsAt = String(formData.get("earlyBirdEndsAt") ?? "");
  const earlyBirdEndsAt = parseDateTimeLocal(rawEndsAt);

  if (rawEndsAt.trim().length > 0 && earlyBirdEndsAt === null) {
    errors.earlyBirdEndsAt = "Use a valid date and time.";
  }

  const rawDemoUrl = String(formData.get("demoUrl") ?? "").trim();
  const demoUrl = rawDemoUrl.length === 0 ? null : rawDemoUrl;

  const rawSortOrder = String(formData.get("sortOrder") ?? "0");
  const sortOrder = parseIntegerInput(rawSortOrder);

  if (sortOrder === null) {
    errors.sortOrder = "Sort order must be a whole number.";
  }

  const features = parseLinesField(
    String(formData.get("features") ?? ""),
    12,
  );
  if (!features.ok) {
    errors.features = features.message;
  }

  const stack = parseLinesField(String(formData.get("stack") ?? ""), 12);
  if (!stack.ok) {
    errors.stack = stack.message;
  }

  const changelog = parseChangelogInput(String(formData.get("changelog") ?? ""));
  if (!changelog.ok) {
    errors.changelog = changelog.message;
  }

  const rawGradient = String(formData.get("coverGradient") ?? "");
  const coverGradient = rawGradient.length === 0 ? null : rawGradient;

  const result = productFormSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    tagline: String(formData.get("tagline") ?? ""),
    description: String(formData.get("description") ?? ""),
    category: String(formData.get("category") ?? ""),
    status: String(formData.get("status") ?? "DRAFT"),
    priceIdr: priceIdr ?? 0,
    earlyBirdPriceIdr,
    earlyBirdEndsAt,
    licenseType: String(formData.get("licenseType") ?? "personal"),
    version: String(formData.get("version") ?? "1.0.0"),
    coverGradient,
    demoUrl,
    featured: formData.get("featured") === "on",
    sortOrder: sortOrder ?? 0,
    features: features.ok ? features.value : [],
    stack: stack.ok ? stack.value : [],
    changelog: changelog.ok ? changelog.value : [],
  });

  if (!result.success) {
    for (const [key, message] of Object.entries(
      fieldErrors(result.error.issues),
    )) {
      if (!(key in errors)) {
        errors[key] = message;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  if (!result.success) {
    return { ok: false, errors: fieldErrors(result.error.issues) };
  }

  return { ok: true, value: result.data };
}

export type SettingsValues = {
  statsLicenses: string;
  statsGmv: string;
  statsUptime: string;
  headline: string;
  subheadline: string;
  featuredSlug: string;
  featuredEndsAt: Date | null;
  announcement: string;
};

const settingsFormSchema = z.object({
  statsLicenses: z.string().trim().min(1, "Required.").max(24),
  statsGmv: z.string().trim().min(1, "Required.").max(24),
  statsUptime: z.string().trim().min(1, "Required.").max(24),
  headline: z.string().trim().min(10, "Headline is too short.").max(120),
  subheadline: z.string().trim().min(20, "Subheadline is too short.").max(300),
  featuredSlug: z.string().trim().max(80),
  featuredEndsAt: z.date().nullable(),
  announcement: z.string().trim().max(160),
});

export function parseSettingsForm(
  formData: FormData,
  allowedSlugs: readonly string[],
): FormParseResult<SettingsValues> {
  const errors: Record<string, string> = {};

  const rawEndsAt = String(formData.get("featuredEndsAt") ?? "");
  const featuredEndsAt = parseDateTimeLocal(rawEndsAt);

  if (rawEndsAt.trim().length > 0 && featuredEndsAt === null) {
    errors.featuredEndsAt = "Use a valid date and time.";
  }

  const featuredSlug = String(formData.get("featuredSlug") ?? "").trim();
  if (featuredSlug.length > 0 && !allowedSlugs.includes(featuredSlug)) {
    errors.featuredSlug = "Choose an existing product.";
  }

  const result = settingsFormSchema.safeParse({
    statsLicenses: String(formData.get("statsLicenses") ?? ""),
    statsGmv: String(formData.get("statsGmv") ?? ""),
    statsUptime: String(formData.get("statsUptime") ?? ""),
    headline: String(formData.get("headline") ?? ""),
    subheadline: String(formData.get("subheadline") ?? ""),
    featuredSlug,
    featuredEndsAt,
    announcement: String(formData.get("announcement") ?? ""),
  });

  if (!result.success) {
    for (const [key, message] of Object.entries(
      fieldErrors(result.error.issues),
    )) {
      if (!(key in errors)) {
        errors[key] = message;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  if (!result.success) {
    return { ok: false, errors: fieldErrors(result.error.issues) };
  }

  return { ok: true, value: result.data };
}

export function settingsToRows(values: SettingsValues): Record<string, string> {
  return {
    "stats.licenses": values.statsLicenses,
    "stats.gmv": values.statsGmv,
    "stats.uptime": values.statsUptime,
    "hero.headline": values.headline,
    "hero.subheadline": values.subheadline,
    "featured.slug": values.featuredSlug,
    "featured.endsAt": values.featuredEndsAt
      ? values.featuredEndsAt.toISOString()
      : "",
    announcement: values.announcement,
  };
}
