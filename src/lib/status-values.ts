export const ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "EXPIRED",
  "FAILED",
  "REFUNDED",
] as const;

export const LICENSE_STATUSES = ["ACTIVE", "REVOKED", "EXPIRED"] as const;

export type OrderStatusValue = (typeof ORDER_STATUSES)[number];
export type LicenseStatusValue = (typeof LICENSE_STATUSES)[number];

export function parseOrderStatus(
  value: string | undefined,
): OrderStatusValue | undefined {
  return ORDER_STATUSES.find((status) => status === value);
}

export function parseLicenseStatus(
  value: string | undefined,
): LicenseStatusValue | undefined {
  return LICENSE_STATUSES.find((status) => status === value);
}

export function parsePage(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value)) {
    return 1;
  }

  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function parseSearchQuery(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 100) : undefined;
}
