import { prisma } from "@/lib/db";
import { listAuditLogs, type AuditLogRow } from "@/lib/audit";
import type { AdminOrderRow } from "@/lib/admin-orders";
import { expireStaleOrders } from "@/lib/orders";

export type AdminOverview = {
  productCount: number;
  availableProductCount: number;
  orderCount: number;
  paidOrderCount: number;
  pendingOrderCount: number;
  licenseCount: number;
  activeLicenseCount: number;
  revenueIdr: number;
  downloadCount: number;
  recentOrders: AdminOrderRow[];
  recentAudit: AuditLogRow[];
};

export async function getAdminOverview(): Promise<AdminOverview> {
  await expireStaleOrders();

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    productCount,
    availableProductCount,
    orderCount,
    paidOrderCount,
    pendingOrderCount,
    licenseCount,
    activeLicenseCount,
    revenue,
    downloadCount,
    recentOrders,
    recentAudit,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: "AVAILABLE" } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.license.count(),
    prisma.license.count({ where: { status: "ACTIVE" } }),
    prisma.order.aggregate({
      where: { status: "PAID" },
      _sum: { amountIdr: true },
    }),
    prisma.downloadLog.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.order.findMany({
      include: {
        product: { select: { name: true, slug: true, version: true } },
        license: { select: { id: true, status: true, keyLast4: true } },
        user: { select: { email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    listAuditLogs(6),
  ]);

  return {
    productCount,
    availableProductCount,
    orderCount,
    paidOrderCount,
    pendingOrderCount,
    licenseCount,
    activeLicenseCount,
    revenueIdr: revenue._sum.amountIdr ?? 0,
    downloadCount,
    recentOrders,
    recentAudit,
  };
}
