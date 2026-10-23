import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth-guards";
import { createProductAction } from "@/app/admin/actions";
import { PageHeader } from "@/components/app/page-header";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New product",
  robots: { index: false, follow: false },
};

export default async function NewProductPage() {
  await requireAdmin();

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Catalog"
        title="New product"
        description="Start as a draft. Upload the delivery file, check the pricing, then publish when it is ready."
      />
      <ProductForm action={createProductAction} submitLabel="Create product" />
    </div>
  );
}
