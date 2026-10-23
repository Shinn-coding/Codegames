import assert from "node:assert/strict";
import test from "node:test";

import {
  canTransitionOrder,
  formatOrderNumber,
  isValidCheckoutAmount,
  isPurchasableStatus,
  checkoutRequestSchema,
} from "../src/lib/checkout-core.ts";

test("formats a stable, sortable order number from a UTC date", () => {
  assert.equal(
    formatOrderNumber(new Date("2026-10-22T23:59:59.000Z"), "a1b2c3"),
    "CG-20261022-A1B2C3",
  );
});

test("rejects order tokens that do not contain six safe characters", () => {
  assert.throws(() => formatOrderNumber(new Date(), "abc"), /six characters/);
  assert.throws(() => formatOrderNumber(new Date(), "a b c d"), /six characters/);
});

test("only accepts positive safe integers as checkout amounts", () => {
  assert.equal(isValidCheckoutAmount(1), true);
  assert.equal(isValidCheckoutAmount(1_599_000), true);
  assert.equal(isValidCheckoutAmount(0), false);
  assert.equal(isValidCheckoutAmount(-1), false);
  assert.equal(isValidCheckoutAmount(1.5), false);
  assert.equal(isValidCheckoutAmount(Number.MAX_SAFE_INTEGER + 1), false);
});

test("only AVAILABLE products can enter checkout", () => {
  assert.equal(isPurchasableStatus("AVAILABLE"), true);
  assert.equal(isPurchasableStatus("COMING_SOON"), false);
  assert.equal(isPurchasableStatus("DRAFT"), false);
  assert.equal(isPurchasableStatus("ARCHIVED"), false);
});

test("allows payment transitions without downgrading a paid order", () => {
  assert.equal(canTransitionOrder("PENDING", "PAID"), true);
  assert.equal(canTransitionOrder("EXPIRED", "PAID"), true);
  assert.equal(canTransitionOrder("FAILED", "PAID"), true);
  assert.equal(canTransitionOrder("PAID", "EXPIRED"), false);
  assert.equal(canTransitionOrder("PAID", "REFUNDED"), true);
  assert.equal(canTransitionOrder("PENDING", "EXPIRED"), true);
  assert.equal(canTransitionOrder("PENDING", "FAILED"), true);
  assert.equal(canTransitionOrder("REFUNDED", "PAID"), false);
  assert.equal(canTransitionOrder("PAID", "PAID"), false);
});

test("validates checkout requests at the boundary", () => {
  assert.deepEqual(
    checkoutRequestSchema.parse({
      slug: "nextjs-saas-starter",
      idempotencyKey: "8ed6b7a1-3d8f-4b1e-9c1a-6a5f4c3b2a10",
    }),
    {
      slug: "nextjs-saas-starter",
      idempotencyKey: "8ed6b7a1-3d8f-4b1e-9c1a-6a5f4c3b2a10",
    },
  );

  assert.equal(
    checkoutRequestSchema.safeParse({ slug: "", idempotencyKey: "not-a-uuid" })
      .success,
    false,
  );
});
