import { env } from "@/lib/env";

import {
  midtransStatusSchema,
  type MidtransStatus,
} from "./midtrans-core";
import type {
  CheckoutInput,
  CheckoutResult,
  PaymentProvider,
} from "./provider";

const SANDBOX_BASE_URL = "https://api.sandbox.midtrans.com";
const PRODUCTION_BASE_URL = "https://api.midtrans.com";
const REQUEST_TIMEOUT_MS = 12_000;

type SnapResponse = {
  token?: string;
  redirect_url?: string;
};

function basicAuth(serverKey: string): string {
  return `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
}

export class MidtransPaymentProvider implements PaymentProvider {
  readonly id = "midtrans";
  private readonly baseUrl: string;

  constructor(
    private readonly serverKey: string,
    isProduction: boolean,
  ) {
    this.baseUrl = isProduction ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL;
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const response = await fetch(`${this.baseUrl}/snap/v1/transactions`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: basicAuth(this.serverKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: input.orderId,
          gross_amount: input.amountIdr,
        },
        item_details: [
          {
            id: input.orderId,
            price: input.amountIdr,
            quantity: 1,
            name: input.productName.slice(0, 50),
          },
        ],
        customer_details: {
          email: input.customerEmail,
        },
        credit_card: {
          secure: true,
        },
        callbacks: {
          finish: `${env.NEXT_PUBLIC_APP_URL}/checkout/success?order=${encodeURIComponent(
            input.orderId,
          )}`,
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Midtrans checkout request failed (${response.status}).`);
    }

    const payload = (await response.json()) as SnapResponse;

    if (!payload.redirect_url) {
      throw new Error("Midtrans did not return a redirect URL.");
    }

    return {
      providerRef: payload.token ?? input.orderId,
      redirectUrl: payload.redirect_url,
    };
  }

  /**
   * Never trust the notification body alone. The webhook re-fetches the
   * authoritative transaction status from Midtrans before changing an order.
   */
  async fetchStatus(orderId: string): Promise<MidtransStatus> {
    const response = await fetch(
      `${this.baseUrl}/v2/${encodeURIComponent(orderId)}/status`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: basicAuth(this.serverKey),
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Midtrans status request failed (${response.status}) for ${orderId}.`,
      );
    }

    const payload: unknown = await response.json();
    return midtransStatusSchema.parse(payload);
  }
}
