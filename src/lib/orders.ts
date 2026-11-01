import { createHash } from "node:crypto";

import type { Prisma } from "@prisma/client";

import type { OrderStatusValue } from "@/lib/checkout-core";
import { prisma } from "@/lib/db";
import { issueLicenseInTransaction, sendLicenseEmail } from "@/lib/licenses";

export type OrderWithProduct = Prisma.OrderGetPayload<{
  include: { product: true; license: true };
}>;

export type PaymentEventInput = {
  provider: string;
  eventId: string;
  orderNumber: string;
  status: OrderStatusValue;
  amountIdr?: number;
  payloadHash: string;
};

export type PaymentEventResult = {
  duplicate: boolean;
  order: OrderWithProduct;
  /** Raw key is returned only on the transition that creates the license. */
  licenseKey?: string;
};

export class OrderNotFoundError extends Error {
  constructor() {
    super("Order not found.");
    this.name = "OrderNotFoundError";
  }
}

export class OrderAmountMismatchError extends Error {
  constructor() {
    super("Payment amount does not match the order total.");
    this.name = "OrderAmountMismatchError";
  }
}

const MAX_PAYMENT_EVENT_ATTEMPTS = 3;

export function hashPayload(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

function uniqueConstraintTargets(error: unknown): string[] {
  if (!isUniqueConstraintError(error)) {
    return [];
  }

  const target = (error as { meta?: { target?: unknown } }).meta?.target;

  if (Array.isArray(target)) {
    return target.map(String);
  }

  if (typeof target === "string") {
    return [target];
  }

  return [];
}

function isRetryableLicenseConflict(error: unknown): boolean {
  return uniqueConstraintTargets(error).some((target) => {
    const normalized = target.toLowerCase();
    return normalized.includes("keyhash") || normalized.includes("orderid");
  });
}

function isEventIdConflict(error: unknown): boolean {
  return uniqueConstraintTargets(error).some((target) =>
    target.toLowerCase().includes("eventid"),
  );
}

/**
 * Neon can close an interactive transaction before Prisma finishes it. The
 * write either committed or rolled back atomically, so replaying the whole
 * idempotent event is safe.
 */
function isRetryableTransactionError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const code = "code" in error ? String(error.code) : "";

  if (code === "P2028") {
    return true;
  }

  const message = error instanceof Error ? error.message : "";

  return /transaction (?:not found|already closed|api error)|closed transaction|timed out/i.test(
    message,
  );
}

async function findOrderWithRelations(
  orderNumber: string,
): Promise<OrderWithProduct | null> {
  return prisma.order.findUnique({
    where: { orderNumber },
    include: { product: true, license: true },
  });
}

/**
 * Expire stale PENDING orders lazily. There is no cron in demo mode, so every
 * entry point that displays or mutates an order calls this first.
 */
export async function expireStaleOrders(
  now: Date = new Date(),
): Promise<number> {
  const result = await prisma.order.updateMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: now },
    },
    data: { status: "EXPIRED" },
  });

  return result.count;
}

export async function getOrderForUser(
  orderNumber: string,
  userId: string,
): Promise<OrderWithProduct | null> {
  await expireStaleOrders();

  return prisma.order.findFirst({
    where: { orderNumber, userId },
    include: { product: true, license: true },
  });
}

export async function getRecentOrdersForUser(
  userId: string,
  limit = 10,
): Promise<OrderWithProduct[]> {
  await expireStaleOrders();

  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { product: true, license: true },
  });
}

/**
 * Persist a provider notification and apply its order-state change in one
 * transaction. The unique `WebhookEvent.eventId` is the replay guard: a
 * duplicate notification returns the current order without touching it.
 *
 * A PAID transition also creates exactly one License in the same transaction.
 * `License.orderId` is unique, and the only retryable unique conflicts are a
 * key-hash collision or a concurrent license for the same order.
 */
export async function recordPaymentEvent(
  input: PaymentEventInput,
): Promise<PaymentEventResult> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_PAYMENT_EVENT_ATTEMPTS; attempt += 1) {
    try {
      const result = await prisma.$transaction(
        async (tx): Promise<PaymentEventResult> => {
          const order = await tx.order.findUnique({
            where: { orderNumber: input.orderNumber },
            include: { product: true, license: true },
          });

          if (!order) {
            throw new OrderNotFoundError();
          }

          if (
            input.amountIdr !== undefined &&
            input.amountIdr !== order.amountIdr
          ) {
            throw new OrderAmountMismatchError();
          }

          const existing = await tx.webhookEvent.findUnique({
            where: { eventId: input.eventId },
          });

          if (existing) {
            return { duplicate: true, order } satisfies PaymentEventResult;
          }

          await tx.webhookEvent.create({
            data: {
              provider: input.provider,
              eventId: input.eventId,
              orderNumber: input.orderNumber,
              payloadHash: input.payloadHash,
              status: input.status,
            },
          });

          let licenseKey: string | undefined;

          if (input.status === "PAID") {
            // A payment can settle after our lazy expiry marked the order expired.
            // The provider is authoritative, so allow that recovery but never
            // resurrect a refunded order.
            await tx.order.updateMany({
              where: {
                id: order.id,
                status: { in: ["PENDING", "EXPIRED", "FAILED"] },
              },
              data: {
                status: "PAID",
                paidAt: new Date(),
              },
            });

            const current = await tx.order.findUniqueOrThrow({
              where: { id: order.id },
              include: { product: true, license: true },
            });

            if (current.status === "PAID" && !current.license) {
              const issued = await issueLicenseInTransaction(tx, current);
              licenseKey = issued.licenseKey;
            }
          } else if (input.status === "EXPIRED") {
            await tx.order.updateMany({
              where: { id: order.id, status: "PENDING" },
              data: { status: "EXPIRED" },
            });
          } else if (input.status === "FAILED") {
            await tx.order.updateMany({
              where: { id: order.id, status: "PENDING" },
              data: { status: "FAILED" },
            });
          } else if (input.status === "REFUNDED") {
            await tx.order.updateMany({
              where: { id: order.id, status: "PAID" },
              data: { status: "REFUNDED" },
            });

            const revokedAt = new Date();
            const revokedLicense = await tx.license.findUnique({
              where: { orderId: order.id },
              select: { id: true },
            });

            await tx.license.updateMany({
              where: { orderId: order.id, status: "ACTIVE" },
              data: { status: "REVOKED", revokedAt },
            });

            // A token that was already issued must stop working immediately,
            // even though the download route also re-checks license status.
            if (revokedLicense) {
              await tx.downloadToken.updateMany({
                where: { licenseId: revokedLicense.id },
                data: { expiresAt: revokedAt },
              });
            }
          }

          const updated = await tx.order.findUniqueOrThrow({
            where: { id: order.id },
            include: { product: true, license: true },
          });

          return {
            duplicate: false,
            order: updated,
            ...(licenseKey ? { licenseKey } : {}),
          } satisfies PaymentEventResult;
        },
      );

      if (result.licenseKey && result.order.license) {
        try {
          await sendLicenseEmail({
            order: result.order,
            license: result.order.license,
            licenseKey: result.licenseKey,
          });
        } catch (error) {
          console.error(
            "[license] Could not send the license email.",
            error instanceof Error ? error.message : "unknown error",
          );
        }
      }

      return result;
    } catch (error) {
      lastError = error;

      if (isRetryableTransactionError(error)) {
        if (attempt < MAX_PAYMENT_EVENT_ATTEMPTS - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, 150 * (attempt + 1)),
          );
          continue;
        }

        throw error;
      }

      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      if (isRetryableLicenseConflict(error)) {
        continue;
      }

      if (isEventIdConflict(error)) {
        const order = await findOrderWithRelations(input.orderNumber);

        if (order) {
          return { duplicate: true, order };
        }
      }

      throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Could not record the payment event after retries.");
}

/**
 * Demo-only settlement. The authenticated owner triggers this from the mock
 * payment page; it exercises the same persisted, idempotent event path as the
 * real webhook without pretending to verify a provider signature.
 */
export async function settleMockOrder(input: {
  orderNumber: string;
  userId: string;
}): Promise<PaymentEventResult> {
  const order = await prisma.order.findFirst({
    where: { orderNumber: input.orderNumber, userId: input.userId },
  });

  if (!order) {
    throw new OrderNotFoundError();
  }

  return recordPaymentEvent({
    provider: "mock",
    eventId: `mock:${order.orderNumber}:settlement`,
    orderNumber: order.orderNumber,
    status: "PAID",
    amountIdr: order.amountIdr,
    payloadHash: hashPayload(`mock:${order.orderNumber}:settlement`),
  });
}
