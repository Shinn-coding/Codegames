import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowSquareOut, FileArrowUp, Trash } from "@phosphor-icons/react/ssr";

import { requireAdmin } from "@/lib/auth-guards";
import { toDateTimeLocalValue } from "@/lib/admin-core";
import { getAdminProduct } from "@/lib/admin-products";
import { formatBytes, formatDate, formatIdr } from "@/lib/format";
import { parseReleases } from "@/lib/marketing";
import {
  deleteFileAction,
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
            Exactly one version is current. Customers always receive the current
            file through a short-lived token.
          </p>
        </div>

        <ProductFileUpload
          productId={product.id}
          defaultVersion={product.version}
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
            {product.files.map((file) => (
              <li
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold text-ink">
                      v{file.version}
                    </p>
                    {file.isCurrent ? (
                      <Badge tone="mint" dot>
                        Current
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate font-mono text-[10px] text-muted">
                    {file.fileName} · {formatBytes(file.sizeBytes)} ·{" "}
                    {formatDate(file.createdAt)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!file.isCurrent ? (
                    <form action={setCurrentFileAction}>
                      <input type="hidden" name="productId" value={product.id} />
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
                    <input type="hidden" name="productId" value={product.id} />
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
              </li>
            ))}
          </ul>
        )}

        <p className="flex items-center gap-2 text-[10px] text-muted">
          <Trash size={12} aria-hidden="true" />
          Current file:{" "}
          {currentFile
            ? `${currentFile.fileName} (v${currentFile.version})`
            : "none"}
        </p>
      </section>
    </div>
  );
}
