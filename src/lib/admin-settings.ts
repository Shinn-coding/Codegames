import { recordAudit } from "@/lib/audit";
import { settingsToRows, type SettingsValues } from "@/lib/admin-core";
import { prisma } from "@/lib/db";
import { getMarketingSettings } from "@/lib/marketing";

export async function getSettingsForAdmin(): Promise<SettingsValues> {
  const settings = await getMarketingSettings();
  const endsAt = settings.featuredEndsAt
    ? new Date(settings.featuredEndsAt)
    : null;

  return {
    statsLicenses: settings.licenses,
    statsGmv: settings.gmv,
    statsUptime: settings.uptime,
    headline: settings.headline,
    subheadline: settings.subheadline,
    featuredSlug: settings.featuredSlug,
    featuredEndsAt: endsAt && !Number.isNaN(endsAt.getTime()) ? endsAt : null,
    announcement: settings.announcement,
  };
}

export async function saveSettings(input: {
  values: SettingsValues;
  actorId: string;
  ipHash?: string;
}): Promise<void> {
  const rows = Object.entries(settingsToRows(input.values));

  await prisma.$transaction(
    rows.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      }),
    ),
  );

  await recordAudit({
    actorId: input.actorId,
    action: "settings.update",
    entity: "setting",
    entityId: "landing",
    meta: Object.fromEntries(rows),
    ipHash: input.ipHash,
  });
}
