"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 3_000;
const MAX_ATTEMPTS = 120;

type OrderStatusPollerProps = {
  orderNumber: string;
  status: string;
};

export function OrderStatusPoller({
  orderNumber,
  status,
}: OrderStatusPollerProps) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (status !== "PENDING") {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const check = async () => {
      if (cancelled) {
        return;
      }

      attempts += 1;

      try {
        const response = await fetch(
          `/api/orders/${encodeURIComponent(orderNumber)}/status`,
          {
            method: "POST",
            cache: "no-store",
            headers: { Accept: "application/json" },
          },
        );

        if (response.ok) {
          const data = (await response.json()) as { status?: string };

          if (data.status && data.status !== status) {
            router.refresh();
            return;
          }
        }
      } catch {
        // A transient network error is retried by the next tick.
      }

      if (cancelled) {
        return;
      }

      if (attempts >= MAX_ATTEMPTS) {
        setTimedOut(true);
        return;
      }

      timer = setTimeout(check, POLL_INTERVAL_MS);
    };

    timer = setTimeout(check, 1_500);

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [orderNumber, router, status]);

  if (status !== "PENDING") {
    return null;
  }

  return (
    <p
      aria-live="polite"
      className="mt-4 inline-flex items-center gap-2 text-[11px] font-medium text-muted"
    >
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-amber motion-safe:animate-pulse"
      />
      {timedOut
        ? "Still waiting for Midtrans. Refresh this page in a moment."
        : "Checking payment status automatically…"}
    </p>
  );
}
