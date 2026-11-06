import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "@phosphor-icons/react/ssr";

import { requireAdmin } from "@/lib/auth-guards";
import { listAdminProducts } from "@/lib/admin-products";
import { formatIdr } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Products",
  robots: { index: false, follow: false },
};

export default async function AdminProductsPage() {
  await requireAdmin();
  const products = await listAdminProducts();

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        description="Create kits, control visibility, and attach the archive customers download."
        actions={
          <ButtonLink href="/admin/products/new" variant="primary" size="md">
            <Plus size={15} weight="bold" aria-hidden="true" />
            New product
          </ButtonLink>
        }
      />

      {products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Create the first kit. It starts as a draft and stays hidden until you publish it."
          action={
            <ButtonLink href="/admin/products/new" variant="primary" size="md">
              Create a product
            </ButtonLink>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="hidden grid-cols-[minmax(0,1.6fr)_110px_130px_90px_80px_90px] gap-3 border-b border-line bg-bg/50 px-5 py-3 text-[9px] font-semibold tracking-[0.16em] text-muted uppercase lg:grid">
            <span>Product</span>
            <span>Status</span>
            <span className="text-right">Price</span>
            <span>Version</span>
            <span className="text-right">Orders</span>
            <span className="text-right">File</span>
          </div>

          <ul className="divide-y divide-line">
            {products.map((product) => {
              const current = product.files.find((file) => file.isCurrent);
              const currentApproved =
                current?.reviewStatus === "APPROVED" &&
                (current.scanStatus === "CLEAN" ||
                  current.scanStatus === "SUSPICIOUS");

              return (
                <li
                  key={product.id}
                  className="grid gap-2 px-5 py-4 lg:grid-cols-[minmax(0,1.6fr)_110px_130px_90px_80px_90px] lg:items-center lg:gap-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="text-[13px] font-semibold text-ink hover:text-forest"
                    >
                      {product.name}
                    </Link>
                    <p className="mt-0.5 truncate font-mono text-[10px] text-muted">
                      /{product.slug} · {product.category}
                    </p>
                  </div>
                  <div className="lg:flex">
                    <StatusBadge status={product.status} />
                  </div>
                  <p className="font-mono text-[11px] text-ink lg:text-right">
                    {formatIdr(product.priceIdr)}
                  </p>
                  <p className="font-mono text-[10px] text-muted">
                    v{product.version}
                  </p>
                  <p className="font-mono text-[10px] text-muted lg:text-right">
                    {product._count.orders}
                  </p>
                  <p className="text-[10px] lg:text-right">
                    {current ? (
                      <span
                        className={
                          currentApproved ? "text-forest" : "text-[#76560e]"
                        }
                      >
                        v{current.version}
                        {currentApproved ? "" : " · pending"}
                      </span>
                    ) : (
                      <span className="text-muted">missing</span>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
