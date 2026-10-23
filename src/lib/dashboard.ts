import { Prisma, type OrderStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { expireStaleOrders } from "@/lib/orders";

export type DashboardOrder = Prisma.OrderGetPayload<{
  include: {
    product: {
      select: { name: true; slug: true; version: true; licenseType: true };
    };
    license: {
      select: {
        id: true;
        status: true;
        keyPrefix: true;
        keyLast4: true;
        type: true;
      };
    };
  };
}>;

export type DashboardLicense = Prisma.LicenseGetPayload<{
  include: {
    product: { select: { name: true; slug: true; version: true } };
    order: { select: { orderNumber: true; status: true } };
    _count: { select: { downloadLogs: true } };
  };
}>;

export type DashboardDownload = Prisma.DownloadLogGetPayload<{
  include: {
    license: {
      select: {
        keyLast4: true;
        product: { select: { name: true; slug: true } };
      };
    };
  };
}>;

export type UserDashboard = {
  orderCount: number;
  paidOrderCount: number;
  activeLicenseCount: number;
  downloadCount: number;
  totalSpentIdr: number;
  recentOrders: DashboardOrder[];
  recentLicenses: DashboardLicense[];
  recentDownloads: DashboardDownload[];
};

const orderInclude = {
  product: {
    select: { name: true, slug: true, version: true, licenseType: true },
  },
  license: {
    select: {
      id: true,
      status: true,
      keyPrefix: true,
      keyLast4: true,
      type: true,
    },
  },
} satisfies Prisma.OrderInclude;

export async function getUserDashboard(userId: string): Promise<UserDashboard> {
  await expireStaleOrders();

  const [
    orderCount,
    paidAggregate,
    paidOrderCount,
    activeLicenseCount,
    downloadCount,
    recentOrders,
    recentLicenses,
    recentDownloads,
  ] = await Promise.all([
    prisma.order.count({ where: { userId } }),
    prisma.order.aggregate({
      where: { userId, status: "PAID" },
      _sum: { amountIdr: true },
    }),
    prisma.order.count({ where: { userId, status: "PAID" } }),
    prisma.license.count({ where: { userId, status: "ACTIVE" } }),
    prisma.downloadLog.count({ where: { license: { userId } } }),
    prisma.order.findMany({
      where: { userId },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.license.findMany({
      where: { userId },
      include: {
        product: { select: { name: true, slug: true, version: true } },
        order: { select: { orderNumber: true, status: true } },
        _count: { select: { downloadLogs: true } },
      },
      orderBy: { issuedAt: "desc" },
      take: 3,
    }),
    prisma.downloadLog.findMany({
      where: { license: { userId } },
      include: {
        license: {
          select: {
            keyLast4: true,
            product: { select: { name: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  return {
    orderCount,
    paidOrderCount,
    activeLicenseCount,
    downloadCount,
    totalSpentIdr: paidAggregate._sum.amountIdr ?? 0,
    recentOrders,
    recentLicenses,
    recentDownloads,
  };
}

export async function listOrdersForUser(
  userId: string,
  status?: OrderStatus,
): Promise<DashboardOrder[]> {
  await expireStaleOrders();

  return prisma.order.findMany({
    where: { userId, ...(status ? { status } : {}) },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function listLicensesForUser(
  userId: string,
): Promise<DashboardLicense[]> {
  return prisma.license.findMany({
    where: { userId },
    include: {
      product: { select: { name: true, slug: true, version: true } },
      order: { select: { orderNumber: true, status: true } },
      _count: { select: { downloadLogs: true } },
    },
    orderBy: { issuedAt: "desc" },
    take: 100,
  });
}

export async function listDownloadsForUser(
  userId: string,
  limit = 50,
): Promise<DashboardDownload[]> {
  return prisma.downloadLog.findMany({
    where: { license: { userId } },
    include: {
      license: {
        select: {
          keyLast4: true,
          product: { select: { name: true, slug: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
