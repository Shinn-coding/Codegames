import type { Order } from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  checkoutRequestSchema,
  createOrderNumber,
  isValidCheckoutAmount,
  isPurchasableStatus,
  ORDER_EXPIRY_MS,
} from "@/lib/checkout-core";
import { prisma } from "@/lib/db";
import { getEffectivePrice } from "@/lib/pricing";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSameOriginRequest } from "@/lib/request";
import { expireStaleOrders } from "@/lib/orders";
import { getPaymentProvider, type PaymentProvider } from "@/lib/payments";

export const runtime = "nodejs";

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

function resumePath(order: {
  orderNumber: string;
  provider: string;
  status: string;
}): string {
  if (order.provider === "mock" && order.status === "PENDING") {
    return `/checkout/mock?order=${encodeURIComponent(order.orderNumber)}`;
  }

  return `/checkout/success?order=${encodeURIComponent(order.orderNumber)}`;
}

async function createPendingOrder(input: {
  userId: string;
  email: string;
  productId: string;
  amountIdr: number;
  idempotencyKey: string;
  provider: string;
}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.order.create({
        data: {
          orderNumber: createOrderNumber(),
          userId: input.userId,
          email: input.email,
          productId: input.productId,
          amountIdr: input.amountIdr,
          idempotencyKey: input.idempotencyKey,
          provider: input.provider,
          expiresAt: new Date(Date.now() + ORDER_EXPIRY_MS),
        },
      });
    } catch (error) {
      const details = error as {
        code?: string;
        meta?: { target?: string[] | string };
      };
      const rawTarget = details.meta?.target;
      const target = Array.isArray(rawTarget)
        ? rawTarget
        : rawTarget
          ? [rawTarget]
          : [];

      // Only retry an order-number collision. An idempotency-key collision
      // means another request won the race; the caller resolves that case.
      if (
        details.code === "P2002" &&
        target.some((field) => field.includes("orderNumber")) &&
        !target.some((field) => field.includes("idempotencyKey"))
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Could not allocate an order number.");
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return json({ error: "Invalid request origin." }, { status: 403 });
  }

  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email;

  if (!userId) {
    return json({ error: "Sign in to continue." }, { status: 401 });
  }

  if (!email) {
    return json(
      { error: "Your account needs an email address before checkout." },
      { status: 403 },
    );
  }

  const limit = await checkRateLimit({
    key: `checkout:${userId}`,
    limit: 5,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return json(
      { error: "Too many checkout attempts. Try again shortly." },
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = checkoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Invalid checkout request." }, { status: 400 });
  }

  let provider: PaymentProvider;
  try {
    provider = getPaymentProvider();
  } catch (error) {
    console.error(
      "[checkout] Payment provider is not configured.",
      error instanceof Error ? error.message : "unknown error",
    );
    return json(
      { error: "Payment provider is not configured." },
      { status: 503 },
    );
  }

  await expireStaleOrders();

  const existing = await prisma.order.findUnique({
    where: { idempotencyKey: parsed.data.idempotencyKey },
  });

  if (existing) {
    if (existing.userId !== userId) {
      return json({ error: "Checkout key is already in use." }, { status: 409 });
    }

    if (existing.provider !== "mock" && existing.status === "PENDING") {
      return json(
        {
          error:
            "Checkout is already in progress. Open your dashboard to review the order.",
        },
        { status: 409 },
      );
    }

    return json({ redirectUrl: resumePath(existing) }, { status: 200 });
  }

  const product = await prisma.product.findUnique({
    where: { slug: parsed.data.slug },
  });

  if (!product || !isPurchasableStatus(product.status)) {
    return json(
      { error: "This product is not available for purchase." },
      { status: 404 },
    );
  }

  const pricing = getEffectivePrice({
    priceIdr: product.priceIdr,
    earlyBirdPriceIdr: product.earlyBirdPriceIdr,
    earlyBirdEndsAt: product.earlyBirdEndsAt,
  });

  if (!isValidCheckoutAmount(pricing.effectivePriceIdr)) {
    return json({ error: "This product has an invalid price." }, { status: 409 });
  }

  let order: Order;
  try {
    order = await createPendingOrder({
      userId,
      email,
      productId: product.id,
      amountIdr: pricing.effectivePriceIdr,
      idempotencyKey: parsed.data.idempotencyKey,
      provider: provider.id,
    });
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code;

    if (code === "P2002") {
      const raced = await prisma.order.findUnique({
        where: { idempotencyKey: parsed.data.idempotencyKey },
      });

      if (raced && raced.userId === userId) {
        return json({ redirectUrl: resumePath(raced) }, { status: 200 });
      }
    }

    console.error(
      "[checkout] Could not create order.",
      error instanceof Error ? error.message : "unknown error",
    );
    return json({ error: "Checkout could not be started." }, { status: 500 });
  }

  try {
    const checkout = await provider.createCheckout({
      orderId: order.orderNumber,
      amountIdr: order.amountIdr,
      customerEmail: order.email,
      productName: product.name,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { providerRef: checkout.providerRef },
    });

    return json({ redirectUrl: checkout.redirectUrl }, { status: 201 });
  } catch (error) {
    await prisma.order
      .updateMany({
        where: { id: order.id, status: "PENDING" },
        data: { status: "FAILED" },
      })
      .catch(() => undefined);

    console.error(
      "[checkout] Provider failed to create a transaction.",
      error instanceof Error ? error.message : "unknown error",
    );

    return json(
      { error: "Checkout could not be started. Please try again." },
      { status: 502 },
    );
  }
}
