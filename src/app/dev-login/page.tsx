import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";
import { isDevAuthEnabled } from "@/lib/env";

export const dynamic = "force-dynamic";

async function signInDev(formData: FormData) {
  "use server";

  if (!isDevAuthEnabled) {
    throw new Error("Dev sign-in is disabled.");
  }

  const email =
    typeof formData.get("email") === "string"
      ? String(formData.get("email")).trim().toLowerCase()
      : "";

  await signIn("dev", { email, redirectTo: "/dashboard" });
}

export default async function DevLoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  if (!isDevAuthEnabled) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          CodeGems
        </Link>

        <div className="mt-8 rounded-2xl border border-[var(--line)] bg-white/75 p-7">
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--muted)] uppercase">
            Local only
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Dev sign in
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Choose a seeded account. This route is unavailable in production
            and when DEV_AUTH is off.
          </p>

          <div className="mt-6 grid gap-2">
            {[
              { email: "admin@local.test", label: "Admin" },
              { email: "user@local.test", label: "User" },
            ].map((account) => (
              <form key={account.email} action={signInDev}>
                <input type="hidden" name="email" value={account.email} />
                <button
                  type="submit"
                  className="flex w-full items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-left text-sm"
                >
                  <span>{account.label}</span>
                  <span className="text-[var(--muted)]">{account.email}</span>
                </button>
              </form>
            ))}
          </div>

          <Link
            href="/login"
            className="mt-6 inline-block text-sm text-[var(--muted)] underline underline-offset-4"
          >
            Back to regular login
          </Link>
        </div>
      </div>
    </main>
  );
}
