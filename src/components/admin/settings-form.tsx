"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";

import {
  initialAdminFormState,
  type AdminFormState,
} from "@/lib/admin-form-state";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { SubmitButton } from "@/components/admin/submit-button";

export type SettingsFormValues = {
  statsLicenses: string;
  statsGmv: string;
  statsUptime: string;
  headline: string;
  subheadline: string;
  featuredSlug: string;
  featuredEndsAtLocal: string;
  announcement: string;
};

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

export function SettingsForm({
  action,
  settings,
  products,
}: {
  action: (
    state: AdminFormState,
    formData: FormData,
  ) => Promise<AdminFormState>;
  settings: SettingsFormValues;
  products: Array<{ slug: string; name: string }>;
}) {
  const [state, formAction] = useActionState(action, initialAdminFormState);
  const value = (key: keyof SettingsFormValues) =>
    state.values?.[key] ?? settings[key];

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === "error" ? (
        <p
          role="alert"
          className="rounded-xl border border-[#b4573a]/30 bg-[#b4573a]/10 px-4 py-3 text-[12px] leading-6 text-[#7d3a20]"
        >
          {state.message ?? "Something needs attention."}
        </p>
      ) : null}

      {state.status === "success" ? (
        <p
          role="status"
          className="rounded-xl border border-mint/40 bg-mint/15 px-4 py-3 text-[12px] leading-6 text-forest"
        >
          {state.message ?? "Saved."}
        </p>
      ) : null}

      <Section
        title="Hero stats"
        description="Three numbers shown under the landing hero. Free-form strings, so badges and percentages are fine."
      >
        <TextField
          label="Licenses issued"
          name="statsLicenses"
          required
          defaultValue={value("statsLicenses")}
          error={state.errors?.statsLicenses}
        />
        <TextField
          label="Developer revenue"
          name="statsGmv"
          required
          defaultValue={value("statsGmv")}
          error={state.errors?.statsGmv}
        />
        <TextField
          label="Uptime"
          name="statsUptime"
          required
          defaultValue={value("statsUptime")}
          error={state.errors?.statsUptime}
        />
      </Section>

      <Section
        title="Hero copy"
        description="The headline and supporting sentence at the top of the storefront."
      >
        <TextField
          label="Headline"
          name="headline"
          required
          className="sm:col-span-2"
          defaultValue={value("headline")}
          error={state.errors?.headline}
        />
        <TextAreaField
          label="Subheadline"
          name="subheadline"
          required
          className="sm:col-span-2"
          defaultValue={value("subheadline")}
          error={state.errors?.subheadline}
        />
      </Section>

      <Section
        title="Featured kit"
        description="Choose the bundle in the hero card and when its countdown ends."
      >
        <SelectField
          label="Featured product"
          name="featuredSlug"
          defaultValue={value("featuredSlug")}
          hint="Empty means fall back to the product flagged as featured."
          error={state.errors?.featuredSlug}
        >
          <option value="">Automatic</option>
          {products.map((product) => (
            <option key={product.slug} value={product.slug}>
              {product.name}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Countdown ends at"
          name="featuredEndsAt"
          type="datetime-local"
          defaultValue={state.values?.featuredEndsAt ?? settings.featuredEndsAtLocal}
          hint="Leave empty to hide the countdown."
          error={state.errors?.featuredEndsAt}
        />
      </Section>

      <Section
        title="Announcement"
        description="The thin bar above the navigation. Keep it short."
      >
        <TextField
          label="Announcement"
          name="announcement"
          className="sm:col-span-2"
          defaultValue={value("announcement")}
          hint="Empty hides the announcement bar."
          error={state.errors?.announcement}
        />
      </Section>

      <div className="flex justify-end pt-2">
        <SubmitButton label="Save settings" pendingLabel="Saving…" />
      </div>
    </form>
  );
}
