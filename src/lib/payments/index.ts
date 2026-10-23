import { env } from "@/lib/env";

import { MidtransPaymentProvider } from "./midtrans";
import { MockPaymentProvider } from "./mock";
import type { PaymentProvider } from "./provider";

export function getPaymentProvider(): PaymentProvider {
  if (env.PAYMENT_PROVIDER === "mock") {
    return new MockPaymentProvider();
  }

  if (!env.MIDTRANS_SERVER_KEY) {
    throw new Error(
      "MIDTRANS_SERVER_KEY is required when PAYMENT_PROVIDER=midtrans.",
    );
  }

  return new MidtransPaymentProvider(
    env.MIDTRANS_SERVER_KEY,
    env.MIDTRANS_IS_PRODUCTION,
  );
}

export function getMidtransProvider(): MidtransPaymentProvider {
  if (env.PAYMENT_PROVIDER !== "midtrans") {
    throw new Error("Midtrans is not the active payment provider.");
  }

  if (!env.MIDTRANS_SERVER_KEY) {
    throw new Error(
      "MIDTRANS_SERVER_KEY is required when PAYMENT_PROVIDER=midtrans.",
    );
  }

  return new MidtransPaymentProvider(
    env.MIDTRANS_SERVER_KEY,
    env.MIDTRANS_IS_PRODUCTION,
  );
}

export type {
  CheckoutInput,
  CheckoutResult,
  PaymentProvider,
} from "./provider";
