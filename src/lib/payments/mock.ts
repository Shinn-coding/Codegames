import type {
  CheckoutInput,
  CheckoutResult,
  PaymentProvider,
} from "./provider";

export class MockPaymentProvider implements PaymentProvider {
  readonly id = "mock";

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    return {
      providerRef: `mock_${input.orderId}`,
      redirectUrl: `/checkout/mock?order=${encodeURIComponent(input.orderId)}`,
    };
  }
}
