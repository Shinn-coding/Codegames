"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

type RevealState =
  | { status: "loading" }
  | { status: "ready"; key: string }
  | { status: "unavailable" };

export function LicenseReveal({
  orderNumber,
  maskedKey,
}: {
  orderNumber: string;
  maskedKey: string;
}) {
  const [state, setState] = useState<RevealState>({ status: "loading" });
  const [copied, setCopied] = useState(false);
  const requestRef = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    let active = true;

    // Keep the same in-flight request through React Strict Mode's development
    // remount, so the one-time cookie is consumed exactly once. A route handler
    // is used instead of a Server Action so consuming the cookie does not
    // refresh the page and replace the revealed key with the masked fallback.
    if (!requestRef.current) {
      requestRef.current = fetch("/api/licenses/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber }),
      })
        .then(async (response) => {
          if (!response.ok) {
            return null;
          }

          const data = (await response.json().catch(() => ({}))) as {
            licenseKey?: unknown;
          };

          return typeof data.licenseKey === "string" ? data.licenseKey : null;
        })
        .catch(() => null);
    }

    requestRef.current
      .then((key) => {
        if (active) {
          setState(key ? { status: "ready", key } : { status: "unavailable" });
        }
      })
      .catch(() => {
        if (active) {
          setState({ status: "unavailable" });
        }
      });

    return () => {
      active = false;
    };
  }, [orderNumber]);

  async function copyKey() {
    if (state.status !== "ready") {
      return;
    }

    try {
      await navigator.clipboard.writeText(state.key);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      // The key stays selectable if the clipboard API is unavailable.
    }
  }

  if (state.status === "loading") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mt-5 rounded-inner border border-mint/30 bg-surface/70 p-5"
      >
        <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
          Unlocking your license
        </p>
        <p className="mt-2 font-mono text-[16px] text-ink/50">
          Preparing your one-time key…
        </p>
      </div>
    );
  }

  if (state.status === "unavailable") {
    return (
      <div className="mt-5 rounded-inner border border-line bg-surface/70 p-5">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
          License key
        </p>
        <p className="mt-2 font-mono text-[16px] font-medium break-all text-ink">
          {maskedKey}
        </p>
        <p className="mt-2 text-[11px] leading-5 text-muted">
          The one-time reveal is unavailable. Use the key from your email.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-inner border border-mint/40 bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
          Full license key
        </p>
        <Button type="button" variant="outline" size="sm" onClick={copyKey}>
          {copied ? (
            <Check size={14} weight="bold" aria-hidden="true" />
          ) : (
            <Copy size={14} weight="bold" aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy key"}
        </Button>
      </div>
      <code className="mt-3 block font-mono text-[18px] leading-7 font-semibold break-all text-ink sm:text-[21px]">
        {state.key}
      </code>
      <p className="mt-3 text-[11px] leading-5 text-muted">
        This is the only time the full key is shown here. Store it somewhere
        safe.
      </p>
    </div>
  );
}
