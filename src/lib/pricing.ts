export type PriceInput = {
  priceIdr: number;
  earlyBirdPriceIdr: number | null;
  earlyBirdEndsAt: Date | string | null;
};

export type EffectivePrice = {
  effectivePriceIdr: number;
  earlyBirdActive: boolean;
  compareAtIdr: number | null;
  earlyBirdSeconds: number;
};

/**
 * Resolve the price a customer should actually pay.
 *
 * Early-bird pricing is only active when both a price and a valid future
 * deadline exist. The list price becomes the compare-at price in that case.
 */
export function getEffectivePrice(
  input: PriceInput,
  now: number = Date.now(),
): EffectivePrice {
  const deadline = input.earlyBirdEndsAt
    ? new Date(input.earlyBirdEndsAt).getTime()
    : Number.NaN;
  const hasDeadline = Number.isFinite(deadline);
  const earlyBirdActive =
    input.earlyBirdPriceIdr !== null &&
    hasDeadline &&
    deadline > now;

  return {
    effectivePriceIdr: earlyBirdActive
      ? (input.earlyBirdPriceIdr ?? input.priceIdr)
      : input.priceIdr,
    earlyBirdActive,
    compareAtIdr: earlyBirdActive ? input.priceIdr : null,
    earlyBirdSeconds: earlyBirdActive
      ? Math.max(0, Math.floor((deadline - now) / 1000))
      : 0,
  };
}
