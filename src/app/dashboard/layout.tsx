import type { ReactNode } from "react";

import { requireUser } from "@/lib/auth-guards";
import { AppShell } from "@/components/app/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();

  return (
    <AppShell area="dashboard" user={user}>
      {children}
    </AppShell>
  );
}
