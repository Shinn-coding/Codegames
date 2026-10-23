"use client";

import { useState } from "react";
import { CircleNotch, DownloadSimple } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

type DownloadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "started" }
  | { status: "error"; message: string };

export function LicenseDownload({ licenseId }: { licenseId: string }) {
  const [state, setState] = useState<DownloadState>({ status: "idle" });

  async function startDownload() {
    setState({ status: "loading" });

    try {
      const response = await fetch(
        `/api/licenses/${encodeURIComponent(licenseId)}/download`,
        {
          method: "POST",
          headers: { Accept: "application/json" },
        },
      );

      const payload = (await response.json().catch(() => ({}))) as {
        url?: unknown;
        fileName?: unknown;
        error?: unknown;
      };

      if (!response.ok || typeof payload.url !== "string") {
        setState({
          status: "error",
          message:
            typeof payload.error === "string"
              ? payload.error
              : "Could not prepare the download.",
        });
        return;
      }

      const anchor = document.createElement("a");
      anchor.href = payload.url;
      anchor.rel = "noopener";
      if (typeof payload.fileName === "string") {
        anchor.download = payload.fileName;
      }
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setState({ status: "started" });
    } catch {
      setState({
        status: "error",
        message: "Could not prepare the download. Check your connection.",
      });
    }
  }

  const isLoading = state.status === "loading";

  return (
    <div className="mt-5 rounded-inner border border-forest/10 bg-surface/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
            Product files
          </p>
          <p className="mt-2 text-[12px] leading-6 text-muted">
            Downloads use a private link that expires after 30 minutes and
            allows at most two downloads.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={startDownload}
          disabled={isLoading}
          className="shrink-0"
        >
          {isLoading ? (
            <CircleNotch
              size={15}
              weight="bold"
              className="animate-spin"
              aria-hidden="true"
            />
          ) : (
            <DownloadSimple size={15} weight="bold" aria-hidden="true" />
          )}
          {isLoading ? "Preparing…" : "Download files"}
        </Button>
      </div>

      {state.status === "error" ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-amber/25 bg-amber/10 px-3 py-2 text-[11px] leading-5 text-[#76560e]"
        >
          {state.message}
        </p>
      ) : null}

      {state.status === "started" ? (
        <p
          role="status"
          aria-live="polite"
          className="mt-3 text-[11px] leading-5 text-forest"
        >
          Download started. Generate a fresh link if the file did not open.
        </p>
      ) : null}
    </div>
  );
}
