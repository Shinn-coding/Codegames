"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CircleNotch, UploadSimple } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";

type UploadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export function ProductFileUpload({
  productId,
  defaultVersion,
}: {
  productId: string;
  defaultVersion: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<UploadState>({ status: "idle" });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);

    setState({ status: "loading" });

    try {
      const response = await fetch(
        `/api/admin/products/${encodeURIComponent(productId)}/files`,
        {
          method: "POST",
          body,
          headers: { Accept: "application/json" },
        },
      );

      const payload = (await response.json().catch(() => ({}))) as {
        error?: unknown;
        file?: { fileName?: string; version?: string };
      };

      if (!response.ok) {
        setState({
          status: "error",
          message:
            typeof payload.error === "string"
              ? payload.error
              : "The upload failed.",
        });
        return;
      }

      form.reset();
      setState({
        status: "success",
        message: `${payload.file?.fileName ?? "File"} uploaded as v${
          payload.file?.version ?? defaultVersion
        }.`,
      });
      router.refresh();
    } catch {
      setState({
        status: "error",
        message: "The upload failed. Check your connection and try again.",
      });
    }
  }

  const loading = state.status === "loading";

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-line bg-surface p-5"
    >
      <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
        Upload a delivery file
      </p>
      <p className="mt-1.5 text-[11px] leading-5 text-muted">
        ZIP, PDF, TXT, or MD, up to 50 MB. The bytes must match the extension,
        and the file is stored privately — never at a public URL.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line bg-bg/50 px-3.5 text-[12px] text-muted transition-colors hover:border-ink/25 hover:text-ink">
          <UploadSimple size={15} aria-hidden="true" />
          <input
            type="file"
            name="file"
            accept=".zip,.pdf,.txt,.md"
            required
            disabled={loading}
            className="min-w-0 flex-1 text-[11px] file:mr-3 file:rounded-full file:border-0 file:bg-forest file:px-3 file:py-1.5 file:text-[10px] file:font-semibold file:text-bg"
          />
        </label>

        <TextField
          label="Version"
          name="version"
          required
          defaultValue={defaultVersion}
          hint="Same version replaces the file."
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] leading-5 text-muted">
          Uploading marks this version as current for new downloads.
        </p>
        <Button type="submit" variant="primary" size="md" disabled={loading}>
          {loading ? (
            <CircleNotch
              size={14}
              weight="bold"
              className="animate-spin"
              aria-hidden="true"
            />
          ) : (
            <UploadSimple size={15} weight="bold" aria-hidden="true" />
          )}
          {loading ? "Uploading…" : "Upload file"}
        </Button>
      </div>

      {state.status === "error" ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-[#b4573a]/30 bg-[#b4573a]/10 px-3 py-2 text-[11px] leading-5 text-[#7d3a20]"
        >
          {state.message}
        </p>
      ) : null}

      {state.status === "success" ? (
        <p
          role="status"
          className="mt-3 rounded-xl border border-mint/40 bg-mint/15 px-3 py-2 text-[11px] leading-5 text-forest"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
