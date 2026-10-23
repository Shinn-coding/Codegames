"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type CheckoutButtonProps = {
  slug: string;
  className?: string;
};

export function CheckoutButton({ slug, className }: CheckoutButtonProps) {
  const router = useRouter();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug, idempotencyKey }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        redirectUrl?: unknown;
        error?: unknown;
      };

      if (response.status === 401) {
        const callbackUrl = encodeURIComponent(`/products/${slug}`);
        router.push(`/login?callbackUrl=${callbackUrl}`);
        return;
      }

      if (!response.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Checkout could not be started. Please try again.",
        );
        return;
      }

      if (typeof data.redirectUrl !== "string") {
        setError("Checkout returned an invalid redirect.");
        return;
      }

      if (data.redirectUrl.startsWith("/")) {
        router.push(data.redirectUrl);
      } else {
        window.location.assign(data.redirectUrl);
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-6">
      <Button
        size="lg"
        className={className ?? "w-full"}
        onClick={startCheckout}
        disabled={pending}
      >
        {pending ? "Starting checkout…" : "Buy now"}
      </Button>

      <p
        aria-live="polite"
        className={
          error
            ? "mt-3 text-center text-[10px] leading-5 text-red-700"
            : "mt-3 text-center text-[10px] leading-5 text-muted"
        }
      >
        {error ?? "Secure checkout. You will review the order before paying."}
      </p>
    </div>
  );
}
