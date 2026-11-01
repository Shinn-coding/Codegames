import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { env } from "@/lib/env";
import { getOrderForUser, hashPayload, recordPaymentEvent } from "@/lib/orders";
import { getMidtransProvider } from "@/lib/payments";
import {
  buildMidtransEventId,
  mapMidtransStatus,
  parseMidtransAmount,
} from "@/lib/payments/midtrans-core";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSameOriginRequest } from "@/lib/request";

export const runtime = "nodejs";

const RATE_LIMIT_PER_MINUTE = 60;

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

function orderPayload(order: { status: string; license: unknown }) {
  return {
    status: order.status,
    licenseReady: Boolean(order.license),
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isSameOriginRequest(request)) {
    return json({ error: "Invalid request origin." }, { status: 403 });
  }

  const { orderNumber } = await params;

  const limit = await checkRateLimit({
    key: `order-status:${session.user.id}:${orderNumber}`,
    limit: RATE_LIMIT_PER_MINUTE,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return json(
      { error: "Too many status requests." },
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

  const order = await getOrderForUser(orderNumber, session.user.id);

  if (!order) {
    return json({ error: "Order not found." }, { status: 404 });
  }

  if (
    order.provider !== "midtrans" ||
    env.PAYMENT_PROVIDER !== "midtrans" ||
    !env.MIDTRANS_SERVER_KEY
  ) {
    return json({ ...orderPayload(order), synced: false });
  }

  if (order.status === "PAID" && order.license) {
    return json({ ...orderPayload(order), synced: false });
  }

  let remote;

  try {
    remote = await getMidtransProvider().fetchStatus(order.orderNumber);
  } catch (error) {
    console.error(
      "[midtrans] Could not refresh order status.",
      error instanceof Error ? error.message : "unknown error",
    );
    return json(
      { error: "Could not verify the transaction with Midtrans." },
      { status: 502 },
    );
  }

  if (remote.order_id !== order.orderNumber) {
    return json({ error: "Order mismatch." }, { status: 409 });
  }

  const remoteAmount = parseMidtransAmount(remote.gross_amount);

  if (remoteAmount === null || remoteAmount !== order.amountIdr) {
    return json({ error: "Order amount mismatch." }, { status: 409 });
  }

  const nextStatus = mapMidtransStatus(
    remote.transaction_status,
    remote.fraud_status,
  );

  // A pending remote status cannot improve the local order. In particular, it
  // must not turn an expired or failed order back into pending.
  if (!nextStatus || nextStatus === "PENDING") {
    return json({ ...orderPayload(order), synced: false });
  }

  if (nextStatus === order.status && order.status !== "PAID") {
    return json({ ...orderPayload(order), synced: false });
  }

  if (nextStatus === order.status && order.license) {
    return json({ ...orderPayload(order), synced: false });
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
      payloadHash: hashPayload(JSON.stringify(remote)),
    });

    return json({
      ...orderPayload(result.order),
      synced: !result.duplicate,
      duplicate: result.duplicate,
    });
  } catch (error) {
    console.error(
      "[midtrans] Could not refresh order status.",
      error instanceof Error ? error.message : "unknown error",
    );
    return json({ error: "Could not refresh order status." }, { status: 500 });
  }
}
