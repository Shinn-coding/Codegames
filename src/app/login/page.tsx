import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";
import { env, isDevAuthEnabled } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

function safeCallbackPath(value: string | null): string {
  const callbackUrl = value ?? "/dashboard";
  return callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
    ? callbackUrl
    : "/dashboard";
}

function safeCallbackUrl(value: FormDataEntryValue | null): string {
  return safeCallbackPath(typeof value === "string" ? value : null);
}

async function signInWithGoogle(formData: FormData) {
  "use server";

  if (!env.AUTH_GOOGLE_ID || !env.AUTH_GOOGLE_SECRET) {
    throw new Error("Google sign-in is not configured.");
  }

  await signIn("google", {
    redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
  });
}

async function signInWithDev(formData: FormData) {
  "use server";

  if (!isDevAuthEnabled) {
    throw new Error("Dev sign-in is disabled.");
  }

  const email =
    typeof formData.get("email") === "string"
      ? String(formData.get("email")).trim().toLowerCase()
      : "";

  await signIn("dev", {
    email,
    redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
  });
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const target = safeCallbackPath(callbackUrl ?? null);

  const session = await auth();
  if (session?.user) {
    redirect(target);
  }

  const googleEnabled = Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          CodeGems
        </Link>

        <div className="mt-8 rounded-2xl border border-[var(--line)] bg-white/75 p-7">
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--muted)] uppercase">
            Demo mode
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Sign in
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Use a seeded local account. No real credentials are required.
          </p>

          {googleEnabled ? (
            <form action={signInWithGoogle} className="mt-6">
              <input type="hidden" name="callbackUrl" value={target} />
              <button
                type="submit"
                className="w-full rounded-full border border-[var(--line)] px-5 py-2.5 text-sm font-medium"
              >
                Continue with Google
              </button>
            </form>
          ) : (
            <p className="mt-6 rounded-xl border border-dashed border-[var(--line)] p-3 text-xs leading-5 text-[var(--muted)]">
              Google OAuth is wired in code but not configured in this demo.
              Set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET to enable it.
            </p>
          )}

          {isDevAuthEnabled ? (
            <div className="mt-6 border-t border-[var(--line)] pt-6">
              <p className="text-sm font-medium">Dev accounts</p>
              <div className="mt-3 grid gap-2">
                {[
                  { email: "admin@local.test", label: "Admin" },
                  { email: "user@local.test", label: "User" },
                ].map((account) => (
                  <form key={account.email} action={signInWithDev}>
                    <input
                      type="hidden"
                      name="callbackUrl"
                      value={target}
                    />
                    <input type="hidden" name="email" value={account.email} />
                    <button
                      type="submit"
                      className="flex w-full items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-left text-sm"
                    >
                      <span>{account.label}</span>
                      <span className="text-[var(--muted)]">
                        {account.email}
                      </span>
                    </button>
                  </form>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-6 text-xs text-[var(--muted)]">
              Dev sign-in is disabled.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
