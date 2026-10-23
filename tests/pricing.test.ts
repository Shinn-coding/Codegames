import assert from "node:assert/strict";
import test from "node:test";

import { getEffectivePrice } from "../src/lib/pricing.ts";

const now = new Date("2026-10-21T12:00:00.000Z").getTime();

test("uses the list price when no early-bird window exists", () => {
  const result = getEffectivePrice(
    {
      priceIdr: 1_099_000,
      earlyBirdPriceIdr: null,
      earlyBirdEndsAt: null,
    },
    now,
  );

  assert.deepEqual(result, {
    effectivePriceIdr: 1_099_000,
    earlyBirdActive: false,
    compareAtIdr: null,
    earlyBirdSeconds: 0,
  });
});

test("applies an active early-bird price and keeps the list price as compare-at", () => {
  const result = getEffectivePrice(
    {
      priceIdr: 1_999_000,
      earlyBirdPriceIdr: 1_599_000,
      earlyBirdEndsAt: "2026-10-28T12:00:00.000Z",
    },
    now,
  );

  assert.equal(result.effectivePriceIdr, 1_599_000);
  assert.equal(result.earlyBirdActive, true);
  assert.equal(result.compareAtIdr, 1_999_000);
  assert.equal(result.earlyBirdSeconds, 7 * 24 * 60 * 60);
});

test("expires an early-bird price exactly at the deadline", () => {
  const result = getEffectivePrice(
    {
      priceIdr: 1_999_000,
      earlyBirdPriceIdr: 1_599_000,
      earlyBirdEndsAt: "2026-10-21T12:00:00.000Z",
    },
    now,
  );

  assert.equal(result.effectivePriceIdr, 1_999_000);
  assert.equal(result.earlyBirdActive, false);
  assert.equal(result.compareAtIdr, null);
});

test("falls back to the list price when the deadline is invalid", () => {
  const result = getEffectivePrice(
    {
      priceIdr: 629_000,
      earlyBirdPriceIdr: 499_000,
      earlyBirdEndsAt: "not-a-date",
    },
    now,
  );

  assert.equal(result.effectivePriceIdr, 629_000);
  assert.equal(result.earlyBirdActive, false);
});

test("treats a zero early-bird price as a real discount", () => {
  const result = getEffectivePrice(
    {
      priceIdr: 459_000,
      earlyBirdPriceIdr: 0,
      earlyBirdEndsAt: new Date(now + 60_000),
    },
    now,
  );

  assert.equal(result.effectivePriceIdr, 0);
  assert.equal(result.earlyBirdActive, true);
  assert.equal(result.compareAtIdr, 459_000);
});
