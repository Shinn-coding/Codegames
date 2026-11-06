"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CircleNotch, UploadSimple } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import {
  MAX_UPLOAD_BYTES,
  PRODUCT_VERSION_PATTERN,
  buildProductStorageKey,
  getFileExtension,
} from "@/lib/upload-core";

type UploadMode = "server" | "blob";

type UploadPayload = {
  error?: unknown;
  file?: { fileName?: string; version?: string; scanStatus?: string };
  scan?: { status?: string; findings?: Array<{ message?: string }> };
};

type UploadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

async function readUploadResponse(response: Response): Promise<UploadPayload> {
  const payload = (await response.json().catch(() => ({}))) as UploadPayload;

  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string" ? payload.error : "The upload failed.",
    );
  }

  return payload;
}

export function ProductFileUpload({
  productId,
  productSlug,
  defaultVersion,
  mode,
}: {
  productId: string;
  productSlug: string;
  defaultVersion: string;
  mode: UploadMode;
}) {
  const router = useRouter();
  const [state, setState] = useState<UploadState>({ status: "idle" });

  async function uploadThroughServer(form: HTMLFormElement) {
    const response = await fetch(
      `/api/admin/products/${encodeURIComponent(productId)}/files`,
      {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      },
    );

    return readUploadResponse(response);
  }

  async function uploadThroughBlob(form: HTMLFormElement) {
    const data = new FormData(form);
    const file = data.get("file");
    const version = String(data.get("version") ?? "").trim();

    if (!(file instanceof File)) {
      throw new Error("Choose a file to upload.");
    }

    if (file.size === 0) {
      throw new Error("The file is empty.");
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error("The file is larger than the 50 MB limit.");
    }

    if (!PRODUCT_VERSION_PATTERN.test(version)) {
      throw new Error("Use a version such as 1.2.0 before uploading.");
    }

    const extension = getFileExtension(file.name);

    if (!["zip", "pdf", "txt", "md"].includes(extension)) {
      throw new Error("Only ZIP, PDF, TXT, or MD files are accepted.");
    }

    const pathname = buildProductStorageKey({
      slug: productSlug,
      version,
      extension,
      randomId: crypto.randomUUID().replace(/-/g, "").slice(0, 12),
    });

    const blob = await upload(pathname, file, {
      access: "private",
      handleUploadUrl: `/api/admin/products/${encodeURIComponent(productId)}/files/upload`,
      clientPayload: JSON.stringify({ version, fileName: file.name }),
      multipart: true,
    });

    const response = await fetch(
      `/api/admin/products/${encodeURIComponent(productId)}/files/finalize`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pathname: blob.pathname,
          version,
          fileName: file.name,
        }),
      },
    );

    return readUploadResponse(response);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    setState({ status: "loading" });

    try {
      const payload =
        mode === "blob"
          ? await uploadThroughBlob(form)
          : await uploadThroughServer(form);

      form.reset();
      const scanStatus =
        payload.scan?.status ?? payload.file?.scanStatus ?? "PENDING";
      setState({
        status: "success",
        message: `${payload.file?.fileName ?? "File"} uploaded as v${
          payload.file?.version ?? defaultVersion
        }. It is queued for admin approval; downloads stay blocked until then.${
          scanStatus === "SUSPICIOUS"
            ? " The scan found something that needs a review note."
            : ""
        }`,
      });
      router.refresh();
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error && error.message
            ? error.message
            : "The upload failed. Check your connection and try again.",
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
        and the file is stored privately. Every upload is scanned and held for
        approval before customers can download it.
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
          Uploading never publishes the file. Review the scan, then approve it.
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
