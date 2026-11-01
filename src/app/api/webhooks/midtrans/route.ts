import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import {
  OrderAmountMismatchError,
  OrderNotFoundError,
  hashPayload,
  recordPaymentEvent,
} from "@/lib/orders";
import {
  buildMidtransEventId,
  mapMidtransStatus,
  midtransNotificationSchema,
  parseMidtransAmount,
  verifyMidtransSignature,
} from "@/lib/payments/midtrans-core";
import { getMidtransProvider } from "@/lib/payments";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, hashClientIp } from "@/lib/request";

export const runtime = "nodejs";

const MAX_WEBHOOK_BYTES = 64 * 1024;

function json(
  body: Record<string, unknown>,
  init?: { status?: number; headers?: HeadersInit },
) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: {
      "Cache-Control": "no-store",
      ...init?.headers,
    },
  });
}

export async function POST(request: Request) {
  if (env.PAYMENT_PROVIDER !== "midtrans" || !env.MIDTRANS_SERVER_KEY) {
    return json(
      { error: "Midtrans webhook is not configured." },
      { status: 503 },
    );
  }

  const limit = await checkRateLimit({
    key: `webhook:midtrans:${hashClientIp(getClientIp(request))}`,
    limit: 120,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return json(
      { error: "Too many webhook requests." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.max(
              1,
              Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000),
            ),
          ),
        },
      },
    );
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_WEBHOOK_BYTES) {
    return json({ error: "Webhook body is too large." }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = midtransNotificationSchema.safeParse(payload);
  if (!parsed.success) {
    return json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  const notification = parsed.data;

  if (
    !verifyMidtransSignature({
      orderId: notification.order_id,
      statusCode: notification.status_code,
      grossAmount: notification.gross_amount,
      serverKey: env.MIDTRANS_SERVER_KEY,
      signature: notification.signature_key,
    })
  ) {
    // Midtrans can sign notifications with a different server key than the
    // one used for Snap/status requests. The notification is only a trigger:
    // every state change below is derived from the authenticated status API,
    // so a signature mismatch must not prevent reconciliation.
    console.warn(
      `[midtrans] Notification signature mismatch for ${notification.order_id}; verifying with the status API.`,
    );
  }

  let remote;
  try {
    remote = await getMidtransProvider().fetchStatus(notification.order_id);
  } catch (error) {
    console.error(
      "[midtrans] Could not re-fetch transaction status.",
      error instanceof Error ? error.message : "unknown error",
    );
    return json(
      { error: "Could not verify the transaction with Midtrans." },
      { status: 502 },
    );
  }

  if (remote.order_id !== notification.order_id) {
    return json({ error: "Webhook order mismatch." }, { status: 400 });
  }

  const notificationAmount = parseMidtransAmount(notification.gross_amount);
  const remoteAmount = parseMidtransAmount(remote.gross_amount);

  if (notificationAmount === null || remoteAmount === null) {
    return json({ error: "Invalid transaction amount." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber: remote.order_id },
    select: { amountIdr: true },
  });

  if (!order) {
    return json({ error: "Order not found." }, { status: 404 });
  }

  if (
    notificationAmount !== order.amountIdr ||
    remoteAmount !== order.amountIdr
  ) {
    return json({ error: "Webhook amount mismatch." }, { status: 400 });
  }

  const nextStatus = mapMidtransStatus(
    remote.transaction_status,
    remote.fraud_status,
  );

  if (!nextStatus) {
    console.warn(
      `[midtrans] Ignoring unsupported transaction status "${remote.transaction_status}" for ${remote.order_id}.`,
    );
    return json({ ok: true, ignored: true });
  }

  try {
    const result = await recordPaymentEvent({
      provider: "midtrans",
      eventId: buildMidtransEventId({
        orderId: remote.order_id,
        transactionId: remote.transaction_id,
        transactionStatus: remote.transaction_status,
        fraudStatus: remote.fraud_status,
      }),
      orderNumber: remote.order_id,
      status: nextStatus,
      amountIdr: remoteAmount,
      payloadHash: hashPayload(rawBody),
    });

    return json({
      ok: true,
      duplicate: result.duplicate,
      status: result.order.status,
    });
  } catch (error) {
    if (error instanceof OrderNotFoundError) {
      return json({ error: "Order not found." }, { status: 404 });
    }

    if (error instanceof OrderAmountMismatchError) {
      return json({ error: "Webhook amount mismatch." }, { status: 400 });
    }

    console.error(
      "[midtrans] Could not process webhook.",
      error instanceof Error ? error.message : "unknown error",
    );
    return json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
