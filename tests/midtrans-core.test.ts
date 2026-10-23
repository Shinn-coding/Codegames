import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMidtransEventId,
  mapMidtransStatus,
  parseMidtransAmount,
  verifyMidtransSignature,
} from "../src/lib/payments/midtrans-core.ts";

const signature =
  "346a99c3fc3038cced43e1435b83977eaabfc9758710229bdbfbf35a7d76100ad77d948cef4e6fadd253bbea3ccd6882d776c7dd250532cc54925f398c1e0971";

test("verifies the documented SHA-512 signature formula", () => {
  assert.equal(
    verifyMidtransSignature({
      orderId: "CG-20261022-A1B2C3",
      statusCode: "200",
      grossAmount: "1599000.00",
      serverKey: "test-server-key",
      signature,
    }),
    true,
  );
  assert.equal(
    verifyMidtransSignature({
      orderId: "CG-20261022-A1B2C3",
      statusCode: "200",
      grossAmount: "1599001.00",
      serverKey: "test-server-key",
      signature,
    }),
    false,
  );
  assert.equal(
    verifyMidtransSignature({
      orderId: "CG-20261022-A1B2C3",
      statusCode: "200",
      grossAmount: "1599000.00",
      serverKey: "wrong-server-key",
      signature,
    }),
    false,
  );
});

test("parses whole-IDR gross amounts and rejects malformed values", () => {
  assert.equal(parseMidtransAmount("1599000.00"), 1_599_000);
  assert.equal(parseMidtransAmount("459000"), 459_000);
  assert.equal(parseMidtransAmount("1,599,000"), null);
  assert.equal(parseMidtransAmount("not-a-number"), null);
  assert.equal(parseMidtransAmount("-1"), null);
});

test("maps Midtrans statuses without marking a challenge as paid", () => {
  assert.equal(mapMidtransStatus("settlement", "accept"), "PAID");
  assert.equal(mapMidtransStatus("capture", "accept"), "PAID");
  assert.equal(mapMidtransStatus("capture", "challenge"), "PENDING");
  assert.equal(mapMidtransStatus("capture", "deny"), "FAILED");
  assert.equal(mapMidtransStatus("pending", null), "PENDING");
  assert.equal(mapMidtransStatus("expire", null), "EXPIRED");
  assert.equal(mapMidtransStatus("deny", null), "FAILED");
  assert.equal(mapMidtransStatus("cancel", null), "FAILED");
  assert.equal(mapMidtransStatus("failure", null), "FAILED");
  assert.equal(mapMidtransStatus("refund", null), "REFUNDED");
  assert.equal(mapMidtransStatus("partial_refund", null), "REFUNDED");
  assert.equal(mapMidtransStatus("chargeback", null), "REFUNDED");
  assert.equal(mapMidtransStatus("mystery", null), null);
});

test("builds a retry-safe event id from the transaction status", () => {
  assert.equal(
    buildMidtransEventId({
      orderId: "CG-20261022-A1B2C3",
      transactionId: "tx-123",
      transactionStatus: "settlement",
      fraudStatus: "accept",
    }),
    "midtrans:tx-123:settlement:accept",
  );
  assert.equal(
    buildMidtransEventId({
      orderId: "CG-20261022-A1B2C3",
      transactionId: null,
      transactionStatus: "expire",
      fraudStatus: null,
    }),
    "midtrans:CG-20261022-A1B2C3:expire:none",
  );
});
