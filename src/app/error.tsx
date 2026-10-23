"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md rounded-2xl border border-[var(--line)] bg-white/70 p-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-[var(--muted)] uppercase">
          Unexpected error
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Something went wrong.</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          The error was contained. Try the request again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-full bg-[var(--foreground)] px-5 py-2.5 text-sm font-medium text-white"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
