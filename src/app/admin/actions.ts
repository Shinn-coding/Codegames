"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  parseProductForm,
  parseSettingsForm,
  PRODUCT_STATUSES,
} from "@/lib/admin-core";
import type { AdminFormState } from "@/lib/admin-form-state";
import {
  AdminLicenseNotFoundError,
  LicenseAccessUnavailableError,
  LicenseAlreadyRevokedError,
  resendLicenseAccess,
  revokeLicense,
} from "@/lib/admin-licenses";
import {
  AdminProductNotFoundError,
  ProductFileApprovalError,
  ProductFileNotFoundError,
  ProductSlugTakenError,
  approveProductFile,
  createAdminProduct,
  deleteProductFile,
  reanalyzeProductFile,
  rejectProductFile,
  setCurrentProductFile,
  setProductStatus,
  updateAdminProduct,
} from "@/lib/admin-products";
import { saveSettings } from "@/lib/admin-settings";
import { getRequestIpHash } from "@/lib/audit";
import { prisma } from "@/lib/db";
import type { ProductStatusValue } from "@/lib/admin-core";

async function requireAdminAction() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized.");
  }

  return session.user;
}

function isId(value: string): boolean {
  return /^[a-z0-9]{16,40}$/.test(value);
}

function revalidateCatalog(slug?: string) {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/pricing");
  revalidatePath("/changelog");
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/products/[slug]", "page");

  if (slug) {
    revalidatePath(`/products/${slug}`);
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong. Try again.";
}

function echoValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      values[key] = value;
    }
  }

  return values;
}

export async function createProductAction(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const user = await requireAdminAction();
  const parsed = parseProductForm(formData);

  if (!parsed.ok) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      errors: parsed.errors,
      values: echoValues(formData),
    };
  }

  let productId: string;

  try {
    const product = await createAdminProduct({
      value: parsed.value,
      actorId: user.id,
      ipHash: await getRequestIpHash(),
    });
    productId = product.id;
  } catch (error) {
    if (error instanceof ProductSlugTakenError) {
      return {
        status: "error",
        message: "That slug is already in use.",
        errors: { slug: "Another product already uses this slug." },
        values: echoValues(formData),
      };
    }

    console.error(
      "[admin] Could not create the product.",
      describeError(error),
    );
    return {
      status: "error",
      message: "The product could not be created. Try again.",
    };
  }

  revalidateCatalog(parsed.value.slug);
  redirect(`/admin/products/${productId}?created=1`);
}

export async function updateProductAction(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const user = await requireAdminAction();
  const productId = String(formData.get("id") ?? "");

  if (!isId(productId)) {
    return { status: "error", message: "Invalid product." };
  }

  const parsed = parseProductForm(formData);

  if (!parsed.ok) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      errors: parsed.errors,
      values: echoValues(formData),
    };
  }

  try {
    await updateAdminProduct({
      id: productId,
      value: parsed.value,
      actorId: user.id,
      ipHash: await getRequestIpHash(),
    });
  } catch (error) {
    if (error instanceof ProductSlugTakenError) {
      return {
        status: "error",
        message: "That slug is already in use.",
        errors: { slug: "Another product already uses this slug." },
        values: echoValues(formData),
      };
    }

    if (error instanceof AdminProductNotFoundError) {
      return { status: "error", message: "That product no longer exists." };
    }

    console.error(
      "[admin] Could not update the product.",
      describeError(error),
    );
    return {
      status: "error",
      message: "The product could not be saved. Try again.",
    };
  }

  revalidateCatalog(parsed.value.slug);
  revalidatePath("/dashboard");
  redirect(`/admin/products/${productId}?saved=1`);
}

export async function setProductStatusAction(
  formData: FormData,
): Promise<void> {
  const user = await requireAdminAction();
  const productId = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!isId(productId)) {
    redirect("/admin/products");
  }

  const nextStatus = PRODUCT_STATUSES.find((value) => value === status) as
    ProductStatusValue | undefined;

  if (!nextStatus) {
    redirect(`/admin/products/${productId}?error=Invalid+status`);
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { slug: true },
  });

  if (!product) {
    redirect("/admin/products");
  }

  try {
    await setProductStatus({
      id: productId,
      status: nextStatus,
      actorId: user.id,
      ipHash: await getRequestIpHash(),
    });
  } catch (error) {
    redirect(
      `/admin/products/${productId}?error=${encodeURIComponent(
        describeError(error),
      )}`,
    );
  }

  revalidateCatalog(product.slug);
  redirect(`/admin/products/${productId}?status=${nextStatus}`);
}

export async function setCurrentFileAction(formData: FormData): Promise<void> {
  const user = await requireAdminAction();
  const productId = String(formData.get("productId") ?? "");
  const fileId = String(formData.get("fileId") ?? "");

  if (!isId(productId) || !isId(fileId)) {
    redirect("/admin/products");
  }

  try {
    await setCurrentProductFile({
      productId,
      fileId,
      actorId: user.id,
      ipHash: await getRequestIpHash(),
    });
  } catch (error) {
    redirect(
      `/admin/products/${productId}?error=${encodeURIComponent(
        describeError(error),
      )}`,
    );
  }

  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products/${productId}?file=current`);
}

export async function rescanFileAction(formData: FormData): Promise<void> {
  const user = await requireAdminAction();
  const productId = String(formData.get("productId") ?? "");
  const fileId = String(formData.get("fileId") ?? "");

  if (!isId(productId) || !isId(fileId)) {
    redirect("/admin/products");
  }

  try {
    await reanalyzeProductFile({
      productId,
      fileId,
      actorId: user.id,
      ipHash: await getRequestIpHash(),
    });
  } catch (error) {
    if (
      error instanceof ProductFileNotFoundError ||
      error instanceof ProductFileApprovalError
    ) {
      redirect(
        `/admin/products/${productId}?error=${encodeURIComponent(
          error.message,
        )}`,
      );
    }

    redirect(
      `/admin/products/${productId}?error=${encodeURIComponent(
        describeError(error),
      )}`,
    );
  }

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/audit");
  redirect(`/admin/products/${productId}?file=scanned`);
}

export async function approveFileAction(formData: FormData): Promise<void> {
  const user = await requireAdminAction();
  const productId = String(formData.get("productId") ?? "");
  const fileId = String(formData.get("fileId") ?? "");
  const note = String(formData.get("note") ?? "");

  if (!isId(productId) || !isId(fileId)) {
    redirect("/admin/products");
  }

  try {
    await approveProductFile({
      productId,
      fileId,
      note,
      actorId: user.id,
      ipHash: await getRequestIpHash(),
    });
  } catch (error) {
    if (
      error instanceof ProductFileNotFoundError ||
      error instanceof ProductFileApprovalError
    ) {
      redirect(
        `/admin/products/${productId}?error=${encodeURIComponent(
          error.message,
        )}`,
      );
    }

    redirect(
      `/admin/products/${productId}?error=${encodeURIComponent(
        describeError(error),
      )}`,
    );
  }

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/audit");
  redirect(`/admin/products/${productId}?file=approved`);
}

export async function rejectFileAction(formData: FormData): Promise<void> {
  const user = await requireAdminAction();
  const productId = String(formData.get("productId") ?? "");
  const fileId = String(formData.get("fileId") ?? "");
  const note = String(formData.get("note") ?? "");

  if (!isId(productId) || !isId(fileId)) {
    redirect("/admin/products");
  }

  try {
    await rejectProductFile({
      productId,
      fileId,
      note,
      actorId: user.id,
      ipHash: await getRequestIpHash(),
    });
  } catch (error) {
    if (error instanceof ProductFileNotFoundError) {
      redirect(`/admin/products/${productId}?error=File+not+found`);
    }

    redirect(
      `/admin/products/${productId}?error=${encodeURIComponent(
        describeError(error),
      )}`,
    );
  }

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/audit");
  redirect(`/admin/products/${productId}?file=rejected`);
}

export async function deleteFileAction(formData: FormData): Promise<void> {
  const user = await requireAdminAction();
  const productId = String(formData.get("productId") ?? "");
  const fileId = String(formData.get("fileId") ?? "");

  if (!isId(productId) || !isId(fileId)) {
    redirect("/admin/products");
  }

  try {
    await deleteProductFile({
      productId,
      fileId,
      actorId: user.id,
      ipHash: await getRequestIpHash(),
    });
  } catch (error) {
    if (error instanceof ProductFileNotFoundError) {
      redirect(`/admin/products/${productId}?error=File+not+found`);
    }

    redirect(
      `/admin/products/${productId}?error=${encodeURIComponent(
        describeError(error),
      )}`,
    );
  }

  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products/${productId}?file=deleted`);
}

export async function saveSettingsAction(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const user = await requireAdminAction();

  const products = await prisma.product.findMany({
    select: { slug: true },
    orderBy: { sortOrder: "asc" },
  });

  const parsed = parseSettingsForm(
    formData,
    products.map((product) => product.slug),
  );

  if (!parsed.ok) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      errors: parsed.errors,
      values: echoValues(formData),
    };
  }

  try {
    await saveSettings({
      values: parsed.value,
      actorId: user.id,
      ipHash: await getRequestIpHash(),
    });
  } catch (error) {
    console.error("[admin] Could not save settings.", describeError(error));
    return {
      status: "error",
      message: "Settings could not be saved. Try again.",
    };
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/settings");

  return { status: "success", message: "Landing settings updated." };
}

export async function revokeLicenseAction(formData: FormData): Promise<void> {
  const user = await requireAdminAction();
  const licenseId = String(formData.get("licenseId") ?? "");

  if (!isId(licenseId)) {
    redirect("/admin/licenses");
  }

  try {
    await revokeLicense({
      licenseId,
      actorId: user.id,
      ipHash: await getRequestIpHash(),
    });
  } catch (error) {
    if (error instanceof LicenseAlreadyRevokedError) {
      redirect("/admin/licenses?error=Already+revoked");
    }

    if (error instanceof AdminLicenseNotFoundError) {
      redirect("/admin/licenses?error=License+not+found");
    }

    redirect(
      `/admin/licenses?error=${encodeURIComponent(describeError(error))}`,
    );
  }

  revalidatePath("/admin/licenses");
  revalidatePath("/admin/audit");
  redirect("/admin/licenses?revoked=1");
}

export async function resendAccessAction(formData: FormData): Promise<void> {
  const user = await requireAdminAction();
  const licenseId = String(formData.get("licenseId") ?? "");

  if (!isId(licenseId)) {
    redirect("/admin/licenses");
  }

  try {
    await resendLicenseAccess({
      licenseId,
      actorId: user.id,
      ipHash: await getRequestIpHash(),
    });
  } catch (error) {
    if (error instanceof LicenseAccessUnavailableError) {
      redirect("/admin/licenses?error=License+is+not+downloadable");
    }

    if (error instanceof AdminLicenseNotFoundError) {
      redirect("/admin/licenses?error=License+not+found");
    }

    console.error("[admin] Could not resend access.", describeError(error));
    redirect("/admin/licenses?error=Could+not+send+the+email");
  }

  revalidatePath("/admin/licenses");
  revalidatePath("/admin/audit");
  redirect("/admin/licenses?resent=1");
}
