import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth-guards";
import { toDateTimeLocalValue } from "@/lib/admin-core";
import { getSettingsForAdmin } from "@/lib/admin-settings";
import { prisma } from "@/lib/db";
import { saveSettingsAction } from "@/app/admin/actions";
import { PageHeader } from "@/components/app/page-header";
import { SettingsForm } from "@/components/admin/settings-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function AdminSettingsPage() {
  await requireAdmin();

  const [settings, products] = await Promise.all([
    getSettingsForAdmin(),
    prisma.product.findMany({
      select: { slug: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Storefront"
        title="Landing settings"
        description="Edits go straight to the database and appear on the storefront without a rebuild."
      />

      <SettingsForm
        action={saveSettingsAction}
        settings={{
          statsLicenses: settings.statsLicenses,
          statsGmv: settings.statsGmv,
          statsUptime: settings.statsUptime,
          headline: settings.headline,
          subheadline: settings.subheadline,
          featuredSlug: settings.featuredSlug,
          featuredEndsAtLocal: toDateTimeLocalValue(settings.featuredEndsAt),
          announcement: settings.announcement,
        }}
        products={products}
      />
    </div>
  );
}
