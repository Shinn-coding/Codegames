import { randomBytes } from "node:crypto";
import { z } from "zod";

export const ORDER_EXPIRY_MS = 24 * 60 * 60 * 1000;

export const ORDER_STATUS_VALUES = [
  "PENDING",
  "PAID",
  "EXPIRED",
  "FAILED",
  "REFUNDED",
] as const;

export type OrderStatusValue = (typeof ORDER_STATUS_VALUES)[number];

const STATUS_TRANSITIONS: Record<OrderStatusValue, readonly OrderStatusValue[]> = {
  PENDING: [],
  PAID: ["PENDING", "EXPIRED", "FAILED"],
  EXPIRED: ["PENDING"],
  FAILED: ["PENDING"],
  REFUNDED: ["PAID"],
};

/**
 * Formats an order number from a UTC date and a six-character token. Keeping
 * the date first makes support and reconciliation work without extra joins.
 */
export function formatOrderNumber(date: Date, rawToken: string): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error("A valid order date is required.");
  }

  const token = rawToken.replace(/[^a-z0-9]/gi, "").toUpperCase();

  if (!/^[A-Z0-9]{6}$/.test(token)) {
    throw new Error("Order token must contain six characters.");
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `CG-${year}${month}${day}-${token}`;
}

export function createOrderNumber(now: Date = new Date()): string {
  return formatOrderNumber(now, randomBytes(3).toString("hex"));
}

/** Checkout amounts are integer IDR values and must be positive. */
export function isValidCheckoutAmount(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

export function isPurchasableStatus(status: string): boolean {
  return status === "AVAILABLE";
}

/**
 * Payment providers can retry notifications. A paid order must never be
 * downgraded to expired or failed by a late/out-of-order event.
 */
export function canTransitionOrder(
  from: OrderStatusValue,
  to: OrderStatusValue,
): boolean {
  return STATUS_TRANSITIONS[to].includes(from);
}

export const checkoutRequestSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, "Invalid product slug."),
  idempotencyKey: z.string().uuid(),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
