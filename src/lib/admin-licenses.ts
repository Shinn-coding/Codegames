import { Prisma, type LicenseStatus } from "@prisma/client";

import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { canDownloadLicense } from "@/lib/download-core";
import { createDownloadLinkForLicense } from "@/lib/downloads";
import { sendLicenseAccessEmail } from "@/lib/licenses";
import { ADMIN_PAGE_SIZE, type Paginated } from "@/lib/admin-orders";

export type AdminLicenseRow = Prisma.LicenseGetPayload<{
  include: {
    product: { select: { name: true; slug: true; version: true } };
    order: {
      select: {
        orderNumber: true;
        email: true;
        status: true;
        amountIdr: true;
      };
    };
    _count: { select: { downloadLogs: true } };
  };
}>;

export type AdminLicenseFilters = {
  status?: LicenseStatus;
  q?: string;
  page?: number;
};

export class AdminLicenseNotFoundError extends Error {
  constructor() {
    super("License not found.");
    this.name = "AdminLicenseNotFoundError";
  }
}

export class LicenseAlreadyRevokedError extends Error {
  constructor() {
    super("This license is already revoked.");
    this.name = "LicenseAlreadyRevokedError";
  }
}

export class LicenseAccessUnavailableError extends Error {
  constructor() {
    super("This license is not active or its order is not paid.");
    this.name = "LicenseAccessUnavailableError";
  }
}

export async function listAdminLicenses(
  filters: AdminLicenseFilters,
): Promise<Paginated<AdminLicenseRow>> {
  const q = filters.q?.trim();
  const page =
    Number.isInteger(filters.page) && filters.page && filters.page > 0
      ? filters.page
      : 1;

  const where: Prisma.LicenseWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(q
      ? {
          OR: [
            { keyLast4: { equals: q.toUpperCase() } },
            { order: { orderNumber: { contains: q, mode: "insensitive" } } },
            { order: { email: { contains: q, mode: "insensitive" } } },
            { product: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.license.count({ where }),
    prisma.license.findMany({
      where,
      include: {
        product: { select: { name: true, slug: true, version: true } },
        order: {
          select: {
            orderNumber: true,
            email: true,
            status: true,
            amountIdr: true,
          },
        },
        _count: { select: { downloadLogs: true } },
      },
      orderBy: { issuedAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
  ]);

  return {
    rows,
    total,
    page,
    pageSize: ADMIN_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
  };
}

export async function revokeLicense(input: {
  licenseId: string;
  actorId: string;
  ipHash?: string;
}): Promise<void> {
  const license = await prisma.license.findUnique({
    where: { id: input.licenseId },
    select: { id: true, status: true, keyLast4: true },
  });

  if (!license) {
    throw new AdminLicenseNotFoundError();
  }

  if (license.status === "REVOKED") {
    throw new LicenseAlreadyRevokedError();
  }

  const revokedAt = new Date();

  await prisma.$transaction([
    prisma.license.update({
      where: { id: license.id },
      data: { status: "REVOKED", revokedAt },
    }),
    // A token issued before the revoke must stop working immediately.
    prisma.downloadToken.updateMany({
      where: { licenseId: license.id },
      data: { expiresAt: revokedAt },
    }),
  ]);

  await recordAudit({
    actorId: input.actorId,
    action: "license.revoke",
    entity: "license",
    entityId: license.id,
    meta: { keyLast4: license.keyLast4 },
    ipHash: input.ipHash,
  });
}

export async function resendLicenseAccess(input: {
  licenseId: string;
  actorId: string;
  ipHash?: string;
}): Promise<void> {
  const license = await prisma.license.findUnique({
    where: { id: input.licenseId },
    include: {
      order: {
        include: {
          product: { select: { name: true, version: true } },
        },
      },
    },
  });

  if (!license) {
    throw new AdminLicenseNotFoundError();
  }

  if (
    !canDownloadLicense({
      licenseStatus: license.status,
      orderStatus: license.order.status,
      licenseExpiresAt: license.expiresAt,
    })
  ) {
    throw new LicenseAccessUnavailableError();
  }

  const link = await createDownloadLinkForLicense(license.id);

  await sendLicenseAccessEmail({
    order: {
      orderNumber: license.order.orderNumber,
      email: license.order.email,
      product: license.order.product,
    },
    license,
    downloadUrl: link.url,
    expiresAt: link.expiresAt,
  });

  await recordAudit({
    actorId: input.actorId,
    action: "license.access_email",
    entity: "license",
    entityId: license.id,
    meta: { keyLast4: license.keyLast4, fileName: link.fileName },
    ipHash: input.ipHash,
  });
}
