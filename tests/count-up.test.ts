import assert from "node:assert/strict";
import test from "node:test";

import {
  easeOutQuart,
  formatStatValue,
  parseStatValue,
} from "../src/lib/count-up.ts";

test("parses grouped, prefixed, and decimal stat values", () => {
  assert.deepEqual(parseStatValue("10,000+"), {
    prefix: "",
    suffix: "+",
    target: 10_000,
    decimals: 0,
    grouping: true,
  });

  assert.deepEqual(parseStatValue("$5M+"), {
    prefix: "$",
    suffix: "M+",
    target: 5,
    decimals: 0,
    grouping: false,
  });

  assert.deepEqual(parseStatValue("99.9%"), {
    prefix: "",
    suffix: "%",
    target: 99.9,
    decimals: 1,
    grouping: false,
  });
});

test("formats counted values with the original prefix, suffix, and precision", () => {
  assert.equal(formatStatValue(6_250, parseStatValue("10,000+")!), "6,250+");
  assert.equal(formatStatValue(3, parseStatValue("$5M+")!), "$3M+");
  assert.equal(formatStatValue(42.34, parseStatValue("99.9%")!), "42.3%");
});

test("leaves values without a numeric part static", () => {
  assert.equal(parseStatValue("Coming soon"), null);
  assert.equal(parseStatValue(""), null);
  assert.equal(parseStatValue("—"), null);
});

test("eases progress without overshooting either endpoint", () => {
  assert.equal(easeOutQuart(0), 0);
  assert.equal(easeOutQuart(1), 1);
  assert.equal(easeOutQuart(-1), 0);
  assert.equal(easeOutQuart(2), 1);
});
