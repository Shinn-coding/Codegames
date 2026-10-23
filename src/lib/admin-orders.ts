import { Prisma, type OrderStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { expireStaleOrders } from "@/lib/orders";

export const ADMIN_PAGE_SIZE = 20;

export type AdminOrderRow = Prisma.OrderGetPayload<{
  include: {
    product: { select: { name: true; slug: true; version: true } };
    license: { select: { id: true; status: true; keyLast4: true } };
    user: { select: { email: true; name: true } };
  };
}>;

export type AdminOrderFilters = {
  status?: OrderStatus;
  q?: string;
  page?: number;
};

export type Paginated<T> = {
  rows: T[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

function normalizePage(page: number | undefined): number {
  return Number.isInteger(page) && page && page > 0 ? page : 1;
}

export function buildOrderWhere(filters: AdminOrderFilters): Prisma.OrderWhereInput {
  const q = filters.q?.trim();

  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { product: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

export async function listAdminOrders(
  filters: AdminOrderFilters,
): Promise<Paginated<AdminOrderRow>> {
  await expireStaleOrders();

  const where = buildOrderWhere(filters);
  const page = normalizePage(filters.page);

  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        product: { select: { name: true, slug: true, version: true } },
        license: { select: { id: true, status: true, keyLast4: true } },
        user: { select: { email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
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
