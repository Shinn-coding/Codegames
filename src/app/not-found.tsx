import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold tracking-[0.18em] text-[var(--muted)] uppercase">
          404
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Page not found.</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          The page you are looking for does not exist.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-[var(--foreground)] px-5 py-2.5 text-sm font-medium text-white"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
