"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";

import {
  initialAdminFormState,
  type AdminFormState,
} from "@/lib/admin-form-state";
import { ButtonLink } from "@/components/ui/button";
import {
  CheckboxField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/ui/field";
import { SubmitButton } from "@/components/admin/submit-button";

export type ProductFormProduct = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: string;
  status: string;
  priceIdr: number;
  earlyBirdPriceIdr: number | null;
  earlyBirdEndsAtLocal: string;
  licenseType: string;
  version: string;
  coverGradient: string | null;
  demoUrl: string | null;
  featured: boolean;
  sortOrder: number;
  features: string[];
  stack: string[];
  changelogJson: string;
};

const statuses = [
  ["DRAFT", "Draft"],
  ["AVAILABLE", "Available"],
  ["COMING_SOON", "Coming soon"],
  ["ARCHIVED", "Archived"],
] as const;

const gradients = [
  ["mint", "Mint"],
  ["amber", "Amber"],
  ["sky", "Sky"],
  ["sage", "Sage"],
  ["clay", "Clay"],
  ["slate", "Slate"],
  ["emerald", "Emerald"],
] as const;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <header className="border-b border-line pb-4">
        <h2 className="font-display text-[19px] font-semibold tracking-[-0.035em] text-ink">
          {title}
        </h2>
        <p className="mt-1 text-[11px] leading-5 text-muted">{description}</p>
      </header>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

const initialChangelog = `[
  {
    "version": "1.0.0",
    "date": "2026-10-22",
    "title": "Initial release",
    "notes": ["First public release."]
  }
]`;

export function ProductForm({
  action,
  product,
  submitLabel,
}: {
  action: (
    state: AdminFormState,
    formData: FormData,
  ) => Promise<AdminFormState>;
  product?: ProductFormProduct;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, initialAdminFormState);

  const value = (name: string, fallback = "") =>
    state.values?.[name] ?? fallback;

  const error = (name: string) => state.errors?.[name];

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      {state.status === "error" ? (
        <div
          role="alert"
          className="rounded-xl border border-[#b4573a]/30 bg-[#b4573a]/10 px-4 py-3 text-[12px] leading-6 text-[#7d3a20]"
        >
          {state.message ?? "Something needs attention."}
        </div>
      ) : null}

      <Section
        title="Identity"
        description="How the kit appears in the catalog and on its detail page."
      >
        <TextField
          label="Name"
          name="name"
          required
          defaultValue={value("name", product?.name ?? "")}
          error={error("name")}
        />
        <TextField
          label="Slug"
          name="slug"
          required
          defaultValue={value("slug", product?.slug ?? "")}
          hint="Lowercase words separated by hyphens."
          error={error("slug")}
        />
        <TextField
          label="Tagline"
          name="tagline"
          required
          className="sm:col-span-2"
          defaultValue={value("tagline", product?.tagline ?? "")}
          error={error("tagline")}
        />
        <TextField
          label="Category"
          name="category"
          required
          defaultValue={value("category", product?.category ?? "")}
          error={error("category")}
        />
        <TextField
          label="License type"
          name="licenseType"
          required
          defaultValue={value("licenseType", product?.licenseType ?? "personal")}
          hint="Shown on receipts and used for new licenses."
          error={error("licenseType")}
        />
        <TextAreaField
          label="Description"
          name="description"
          required
          className="sm:col-span-2"
          defaultValue={value("description", product?.description ?? "")}
          hint="Plain text. Rendered as paragraphs on the product page."
          error={error("description")}
        />
        <TextAreaField
          label="Features"
          name="features"
          defaultValue={value("features", product?.features.join("\n") ?? "")}
          hint="One feature per line, up to 12."
          error={error("features")}
        />
        <TextAreaField
          label="Stack"
          name="stack"
          defaultValue={value("stack", product?.stack.join("\n") ?? "")}
          hint="One item per line, up to 12."
          error={error("stack")}
        />
      </Section>

      <Section
        title="Pricing"
        description="Amounts are whole rupiah. Early-bird pricing applies only before its deadline."
      >
        <TextField
          label="List price (IDR)"
          name="priceIdr"
          required
          inputMode="numeric"
          defaultValue={value("priceIdr", product ? String(product.priceIdr) : "")}
          hint="Example: 1099000 or 1.099.000"
          error={error("priceIdr")}
        />
        <TextField
          label="Early-bird price (IDR)"
          name="earlyBirdPriceIdr"
          inputMode="numeric"
          defaultValue={value(
            "earlyBirdPriceIdr",
            product?.earlyBirdPriceIdr ? String(product.earlyBirdPriceIdr) : "",
          )}
          hint="Leave empty for no early-bird price."
          error={error("earlyBirdPriceIdr")}
        />
        <TextField
          label="Early-bird ends at"
          name="earlyBirdEndsAt"
          type="datetime-local"
          defaultValue={value(
            "earlyBirdEndsAt",
            product?.earlyBirdEndsAtLocal ?? "",
          )}
          error={error("earlyBirdEndsAt")}
        />
      </Section>

      <Section
        title="Publishing"
        description="Control catalog visibility, versioning, and the product cover."
      >
        <SelectField
          label="Status"
          name="status"
          required
          defaultValue={value("status", product?.status ?? "DRAFT")}
          error={error("status")}
        >
          {statuses.map(([value_, label]) => (
            <option key={value_} value={value_}>
              {label}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Version"
          name="version"
          required
          defaultValue={value("version", product?.version ?? "1.0.0")}
          hint="Semantic version, for example 1.2.0. Uploads are keyed by version."
          error={error("version")}
        />
        <SelectField
          label="Cover gradient"
          name="coverGradient"
          defaultValue={value("coverGradient", product?.coverGradient ?? "mint")}
          error={error("coverGradient")}
        >
          <option value="">Default (mint)</option>
          {gradients.map(([value_, label]) => (
            <option key={value_} value={value_}>
              {label}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Sort order"
          name="sortOrder"
          inputMode="numeric"
          defaultValue={value("sortOrder", product ? String(product.sortOrder) : "0")}
          hint="Lower numbers appear first."
          error={error("sortOrder")}
        />
        <TextField
          label="Demo URL"
          name="demoUrl"
          type="url"
          className="sm:col-span-2"
          defaultValue={value("demoUrl", product?.demoUrl ?? "")}
          hint="Optional. Full URL including https://"
          error={error("demoUrl")}
        />
        <CheckboxField
          label="Feature this kit"
          name="featured"
          defaultChecked={
            state.values ? state.values.featured === "on" : product?.featured
          }
          hint="Featured kits are preferred for the landing hero."
          className="sm:col-span-2"
        />
      </Section>

      <Section
        title="Changelog"
        description="A JSON array of releases. Invalid JSON is rejected before saving."
      >
        <TextAreaField
          label="Releases"
          name="changelog"
          className="sm:col-span-2 font-mono text-[12px]"
          rows={14}
          defaultValue={value(
            "changelog",
            product?.changelogJson ?? initialChangelog,
          )}
          hint='Shape: [{"version":"1.0.0","date":"2026-10-22","title":"…","notes":["…"]}]'
          error={error("changelog")}
        />
      </Section>

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <ButtonLink href="/admin/products" variant="outline" size="md">
          Cancel
        </ButtonLink>
        <SubmitButton label={submitLabel} pendingLabel="Saving…" />
      </div>
    </form>
  );
}
