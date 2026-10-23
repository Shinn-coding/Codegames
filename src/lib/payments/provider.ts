export type CheckoutInput = {
  orderId: string;
  amountIdr: number;
  customerEmail: string;
  productName: string;
};

export type CheckoutResult = {
  providerRef: string;
  redirectUrl: string;
};

export interface PaymentProvider {
  readonly id: string;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
}
