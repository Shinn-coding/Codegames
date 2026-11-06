import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowSquareOut,
  Check,
  FileArrowUp,
  ShieldCheck,
  Trash,
  Warning,
  X,
} from "@phosphor-icons/react/ssr";

import { requireAdmin } from "@/lib/auth-guards";
import { toDateTimeLocalValue } from "@/lib/admin-core";
import { getAdminProduct } from "@/lib/admin-products";
import { env } from "@/lib/env";
import { formatBytes, formatDate, formatIdr } from "@/lib/format";
import { parseReleases } from "@/lib/marketing";
import type { UploadScanReport } from "@/lib/upload-security";
import {
  approveFileAction,
  deleteFileAction,
  rejectFileAction,
  rescanFileAction,
  setCurrentFileAction,
  setProductStatusAction,
  updateProductAction,
} from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { ProductFileUpload } from "@/components/admin/product-file-upload";
import { ProductForm } from "@/components/admin/product-form";
import { SubmitButton } from "@/components/admin/submit-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit product",
  robots: { index: false, follow: false },
};

const statusActions = [
  { value: "AVAILABLE", label: "Publish" },
  { value: "DRAFT", label: "Unpublish" },
  { value: "COMING_SOON", label: "Coming soon" },
  { value: "ARCHIVED", label: "Archive" },
] as const;

const scanLabels: Record<string, string> = {
  PENDING: "Scan pending",
  CLEAN: "Scan clean",
  SUSPICIOUS: "Review needed",
  BLOCKED: "Blocked",
  ERROR: "Scan failed",
};

const reviewLabels: Record<string, string> = {
  PENDING: "Awaiting approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

function scanTone(status: string): "mint" | "amber" | "muted" {
  if (status === "CLEAN") return "mint";
  if (status === "BLOCKED" || status === "ERROR" || status === "SUSPICIOUS") {
    return "amber";
  }
  return "muted";
}

function parseScanReport(value: unknown): UploadScanReport | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<UploadScanReport>;
  return Array.isArray(candidate.findings)
    ? (candidate as UploadScanReport)
    : null;
}

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    created?: string;
    saved?: string;
    status?: string;
    file?: string;
    error?: string;
  }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const product = await getAdminProduct(id);

  if (!product) {
    notFound();
  }

  const currentFile = product.files.find((file) => file.isCurrent);
  const currentFileApproved =
    currentFile?.reviewStatus === "APPROVED" &&
    (currentFile.scanStatus === "CLEAN" ||
      currentFile.scanStatus === "SUSPICIOUS");

  const notice = query.error
    ? { tone: "error" as const, message: query.error }
    : query.created
      ? { tone: "success" as const, message: "Product created." }
      : query.saved
        ? { tone: "success" as const, message: "Changes saved." }
        : query.status
          ? {
              tone: "success" as const,
              message: `Status changed to ${query.status}.`,
            }
          : query.file === "current"
            ? {
                tone: "success" as const,
                message: "Current file updated.",
              }
            : query.file === "deleted"
              ? { tone: "success" as const, message: "File deleted." }
              : query.file === "approved"
                ? {
                    tone: "success" as const,
                    message: "File approved and published for downloads.",
                  }
                : query.file === "rejected"
                  ? { tone: "success" as const, message: "File rejected." }
                  : query.file === "scanned"
                    ? {
                        tone: "success" as const,
                        message:
                          "Scan completed. Review the findings, then approve or reject.",
                      }
                    : null;

  return (
    <div className="space-y-7">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-2 text-[11px] font-semibold text-forest transition-colors hover:text-ink"
      >
        <ArrowLeft size={13} weight="bold" aria-hidden="true" />
        All products
      </Link>

      <PageHeader
        eyebrow={`${product.category} · v${product.version}`}
        title={product.name}
        description={`/${product.slug} · ${formatIdr(product.priceIdr)} · ${product._count.orders} orders · ${product._count.licenses} licenses`}
        actions={
          <>
            <StatusBadge status={product.status} />
            {product.status === "AVAILABLE" ? (
              <ButtonLink
                href={`/products/${product.slug}`}
                variant="outline"
                size="md"
              >
                View page
                <ArrowSquareOut size={13} aria-hidden="true" />
              </ButtonLink>
            ) : null}
          </>
        }
      />

      {notice ? (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={
            notice.tone === "error"
              ? "rounded-xl border border-[#b4573a]/30 bg-[#b4573a]/10 px-4 py-3 text-[12px] leading-6 text-[#7d3a20]"
              : "rounded-xl border border-mint/40 bg-mint/15 px-4 py-3 text-[12px] leading-6 text-forest"
          }
        >
          {notice.message}
        </p>
      ) : null}

      <section
        aria-labelledby="publishing-heading"
        className="rounded-2xl border border-line bg-surface p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2
              id="publishing-heading"
              className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase"
            >
              Publishing
            </h2>
            <p className="mt-1.5 text-[11px] leading-5 text-muted">
              Products are archived instead of deleted so order and license
              history stays intact.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {statusActions.map((action) => (
              <form key={action.value} action={setProductStatusAction}>
                <input type="hidden" name="id" value={product.id} />
                <input type="hidden" name="status" value={action.value} />
                <SubmitButton
                  label={action.label}
                  pendingLabel="…"
                  variant="outline"
                  size="sm"
                  className={
                    product.status === action.value ? "border-ink/30 bg-bg" : ""
                  }
                />
              </form>
            ))}
          </div>
        </div>
      </section>

      <ProductForm
        action={updateProductAction}
        submitLabel="Save product"
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          tagline: product.tagline,
          description: product.description,
          category: product.category,
          status: product.status,
          priceIdr: product.priceIdr,
          earlyBirdPriceIdr: product.earlyBirdPriceIdr,
          earlyBirdEndsAtLocal: toDateTimeLocalValue(product.earlyBirdEndsAt),
          licenseType: product.licenseType,
          version: product.version,
          coverGradient: product.coverGradient,
          demoUrl: product.demoUrl,
          featured: product.featured,
          sortOrder: product.sortOrder,
          features: product.features,
          stack: product.stack,
          changelogJson: JSON.stringify(
            parseReleases(product.changelog),
            null,
            2,
          ),
        }}
      />

      <section aria-labelledby="files-heading" className="space-y-4">
        <div>
          <h2
            id="files-heading"
            className="font-display text-[22px] font-semibold tracking-[-0.04em] text-ink"
          >
            Delivery files
          </h2>
          <p className="mt-1.5 text-[11px] leading-5 text-muted">
            Uploads are quarantined, scanned, and held for approval. Customers
            only receive the current approved file through a short-lived token.
          </p>
        </div>

        <ProductFileUpload
          productId={product.id}
          productSlug={product.slug}
          defaultVersion={product.version}
          mode={env.STORAGE_DRIVER === "vercel-blob" ? "blob" : "server"}
        />

        {product.files.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface/60 p-6">
            <p className="flex items-center gap-2 text-sm text-muted">
              <FileArrowUp size={16} aria-hidden="true" />
              No file uploaded yet. Downloads will return 404 until one exists.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {product.files.map((file) => {
              const report = parseScanReport(file.scanReport);
              const approved = file.reviewStatus === "APPROVED";
              const canApprove =
                file.scanStatus === "CLEAN" || file.scanStatus === "SUSPICIOUS";

              return (
                <li key={file.id} className="space-y-3 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-semibold text-ink">
                          v{file.version}
                        </p>
                        {file.isCurrent ? (
                          <Badge tone={approved ? "mint" : "amber"} dot>
                            {approved ? "Current" : "Current · blocked"}
                          </Badge>
                        ) : null}
                        <Badge tone={scanTone(file.scanStatus)}>
                          {scanLabels[file.scanStatus] ?? file.scanStatus}
                        </Badge>
                        <Badge tone={approved ? "mint" : "muted"}>
                          {reviewLabels[file.reviewStatus] ?? file.reviewStatus}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate font-mono text-[10px] text-muted">
                        {file.fileName} · {formatBytes(file.sizeBytes)} ·{" "}
                        {formatDate(file.createdAt)}
                      </p>
                      <p className="mt-1 font-mono text-[9px] text-muted">
                        SHA-256: {file.checksumSha256.slice(0, 24)}…
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {file.scanStatus === "PENDING" ||
                      file.scanStatus === "ERROR" ? (
                        <form action={rescanFileAction}>
                          <input
                            type="hidden"
                            name="productId"
                            value={product.id}
                          />
                          <input type="hidden" name="fileId" value={file.id} />
                          <SubmitButton
                            label="Scan file"
                            pendingLabel="Scanning…"
                            variant="outline"
                            size="sm"
                          />
                        </form>
                      ) : null}

                      {!approved && canApprove ? (
                        <form
                          action={approveFileAction}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <input
                            type="hidden"
                            name="productId"
                            value={product.id}
                          />
                          <input type="hidden" name="fileId" value={file.id} />
                          <input
                            name="note"
                            maxLength={500}
                            required={file.scanStatus === "SUSPICIOUS"}
                            placeholder={
                              file.scanStatus === "SUSPICIOUS"
                                ? "Required: explain why this is safe"
                                : "Optional review note"
                            }
                            className="h-10 w-56 rounded-xl border border-line bg-bg px-3 text-[11px] text-ink outline-none placeholder:text-muted focus:border-ink/30"
                          />
                          <SubmitButton
                            label={
                              file.scanStatus === "SUSPICIOUS"
                                ? "Approve with note"
                                : "Approve & publish"
                            }
                            pendingLabel="Approving…"
                            variant="primary"
                            size="sm"
                          />
                        </form>
                      ) : null}

                      {!approved ? (
                        <form action={rejectFileAction}>
                          <input
                            type="hidden"
                            name="productId"
                            value={product.id}
                          />
                          <input type="hidden" name="fileId" value={file.id} />
                          <SubmitButton
                            label="Reject"
                            pendingLabel="…"
                            variant="outline"
                            size="sm"
                          />
                        </form>
                      ) : null}

                      {approved && !file.isCurrent ? (
                        <form action={setCurrentFileAction}>
                          <input
                            type="hidden"
                            name="productId"
                            value={product.id}
                          />
                          <input type="hidden" name="fileId" value={file.id} />
                          <SubmitButton
                            label="Set current"
                            pendingLabel="…"
                            variant="outline"
                            size="sm"
                          />
                        </form>
                      ) : null}

                      <form action={deleteFileAction}>
                        <input
                          type="hidden"
                          name="productId"
                          value={product.id}
                        />
                        <input type="hidden" name="fileId" value={file.id} />
                        <SubmitButton
                          label="Delete"
                          pendingLabel="…"
                          variant="ghost"
                          size="sm"
                          confirm={`Delete v${file.version} (${file.fileName})? This removes the stored bytes.`}
                        />
                      </form>
                    </div>
                  </div>

                  {report && report.findings.length > 0 ? (
                    <details className="rounded-xl border border-line bg-bg/50 px-3 py-2">
                      <summary className="flex cursor-pointer items-center gap-2 text-[10px] font-semibold text-ink">
                        <Warning size={12} aria-hidden="true" />
                        Scan findings ({report.findings.length})
                      </summary>
                      <ul className="mt-2 max-h-48 space-y-1.5 overflow-auto pr-2">
                        {report.findings.map((finding, index) => (
                          <li
                            key={`${finding.code}-${index}`}
                            className="flex gap-2 text-[10px] leading-5 text-muted"
                          >
                            {finding.severity === "block" ? (
                              <X
                                size={11}
                                className="mt-1 shrink-0 text-[#b4573a]"
                                aria-hidden="true"
                              />
                            ) : finding.severity === "warn" ? (
                              <Warning
                                size={11}
                                className="mt-1 shrink-0 text-[#76560e]"
                                aria-hidden="true"
                              />
                            ) : (
                              <Check
                                size={11}
                                className="mt-1 shrink-0 text-forest"
                                aria-hidden="true"
                              />
                            )}
                            <span>
                              {finding.message}
                              {finding.path ? (
                                <span className="font-mono text-[9px] text-muted">
                                  {" "}
                                  ({finding.path})
                                </span>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}

                  {file.reviewNote ? (
                    <p className="text-[10px] leading-5 text-muted">
                      Review note: {file.reviewNote}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <p className="flex items-center gap-2 text-[10px] text-muted">
          {currentFileApproved ? (
            <ShieldCheck size={12} aria-hidden="true" />
          ) : (
            <Trash size={12} aria-hidden="true" />
          )}
          Current file:{" "}
          {currentFile
            ? `${currentFile.fileName} (v${currentFile.version})${
                currentFileApproved
                  ? ""
                  : " — pending approval; downloads are blocked"
              }`
            : "none"}
        </p>
      </section>
    </div>
  );
}
