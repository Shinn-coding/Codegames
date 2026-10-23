import type { ReactNode } from "react";

import { requireAdmin } from "@/lib/auth-guards";
import { AppShell } from "@/components/app/app-shell";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <AppShell area="admin" user={user}>
      {children}
    </AppShell>
  );
}
