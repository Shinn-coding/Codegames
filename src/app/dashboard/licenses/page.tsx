import type { Metadata } from "next";

import { requireUser } from "@/lib/auth-guards";
import { listLicensesForUser } from "@/lib/dashboard";
import { env } from "@/lib/env";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { LicenseCard } from "@/components/dashboard/license-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Licenses",
  robots: { index: false, follow: false },
};

export default async function DashboardLicensesPage() {
  const user = await requireUser();
  const licenses = await listLicensesForUser(user.id);
  const activationUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/licenses/activate`;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Licensing"
        title="Your licenses"
        description="Keys are stored as HMAC hashes. Only the prefix and last four characters can be shown again."
        actions={
          <ButtonLink href="/dashboard/downloads" variant="outline" size="md">
            Download history
          </ButtonLink>
        }
      />

      {licenses.length === 0 ? (
        <EmptyState
          title="No licenses yet"
          description="A personal license is issued automatically after a paid order. It carries one activation slot by default."
          action={
            <ButtonLink href="/products" variant="primary" size="md">
              Find a kit
            </ButtonLink>
          }
        />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {licenses.map((license) => (
            <LicenseCard key={license.id} license={license} />
          ))}
        </div>
      )}

      <section
        aria-labelledby="activation-heading"
        className="rounded-2xl border border-line bg-forest p-6 text-bg sm:p-7"
      >
        <p className="text-[9px] font-semibold tracking-[0.18em] text-bg/45 uppercase">
          Activation API
        </p>
        <h2
          id="activation-heading"
          className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em]"
        >
          Activate from your build.
        </h2>
        <p className="mt-2 max-w-2xl text-[12px] leading-6 text-bg/65">
          Send your key with a stable instance ID. Repeating the same instance is
          idempotent; a different instance after the activation limit returns
          <span className="font-mono text-bg/80"> 409</span>.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-4 font-mono text-[11px] leading-6 text-bg/85">
{`curl -X POST ${activationUrl} \\
  -H 'Content-Type: application/json' \\
  -d '{"licenseKey":"GABUT-XXXX-XXXX-XXXX-XXXX","instanceId":"machine-1"}'`}
        </pre>
      </section>
    </div>
  );
}
