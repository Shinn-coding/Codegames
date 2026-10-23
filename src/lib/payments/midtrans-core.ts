import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import type { OrderStatusValue } from "../checkout-core.ts";

export const midtransNotificationSchema = z.object({
  order_id: z.string().min(1).max(120),
  status_code: z.string().regex(/^\d{3}$/),
  gross_amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
  signature_key: z.string().regex(/^[a-f0-9]{128}$/i),
  transaction_status: z.string().min(1).max(32),
  fraud_status: z.string().max(32).nullable().optional(),
  transaction_id: z.string().max(120).nullable().optional(),
  status_message: z.string().max(255).nullable().optional(),
});

export const midtransStatusSchema = z.object({
  order_id: z.string().min(1).max(120),
  status_code: z.string().regex(/^\d{3}$/),
  gross_amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
  transaction_status: z.string().min(1).max(32),
  fraud_status: z.string().max(32).nullable().optional(),
  transaction_id: z.string().max(120).nullable().optional(),
  status_message: z.string().max(255).nullable().optional(),
});

export type MidtransNotification = z.infer<typeof midtransNotificationSchema>;
export type MidtransStatus = z.infer<typeof midtransStatusSchema>;

type SignatureInput = {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  serverKey: string;
  signature: string;
};

/**
 * Midtrans signs notifications with SHA-512 over:
 * order_id + status_code + gross_amount + server_key.
 *
 * Compare the hex digests with a constant-time primitive so a malformed
 * signature cannot leak information through timing.
 */
export function verifyMidtransSignature(input: SignatureInput): boolean {
  if (!/^[a-f0-9]{128}$/i.test(input.signature)) {
    return false;
  }

  const expected = createHash("sha512")
    .update(
      `${input.orderId}${input.statusCode}${input.grossAmount}${input.serverKey}`,
    )
    .digest();
  const received = Buffer.from(input.signature, "hex");

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}

/**
 * Midtrans sends `gross_amount` as a decimal string such as "1599000.00".
 * CodeGems stores whole IDR values, so reject anything that is not a safe
 * non-negative integer after rounding.
 */
export function parseMidtransAmount(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    return null;
  }

  const amount = Math.round(Number(value));

  if (!Number.isSafeInteger(amount) || amount < 0) {
    return null;
  }

  return amount;
}

export function mapMidtransStatus(
  transactionStatus: string,
  fraudStatus?: string | null,
): OrderStatusValue | null {
  const status = transactionStatus.toLowerCase();
  const fraud = fraudStatus?.toLowerCase() ?? null;

  switch (status) {
    case "settlement":
      return "PAID";
    case "capture":
      if (fraud === "accept" || fraud === null) {
        return "PAID";
      }
      if (fraud === "challenge") {
        return "PENDING";
      }
      return "FAILED";
    case "pending":
      return "PENDING";
    case "expire":
      return "EXPIRED";
    case "deny":
    case "cancel":
    case "failure":
      return "FAILED";
    case "refund":
    case "partial_refund":
    case "chargeback":
      return "REFUNDED";
    default:
      return null;
  }
}

export function buildMidtransEventId(input: {
  orderId: string;
  transactionId?: string | null;
  transactionStatus: string;
  fraudStatus?: string | null;
}): string {
  const transaction = input.transactionId?.trim() || input.orderId;
  const fraud = input.fraudStatus?.trim().toLowerCase() || "none";
  return `midtrans:${transaction}:${input.transactionStatus.toLowerCase()}:${fraud}`;
}
