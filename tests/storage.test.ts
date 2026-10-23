import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  LocalStorageDriver,
  assertSafeStorageKey,
} from "../src/lib/storage/local.ts";

test("accepts safe storage keys", () => {
  assert.equal(
    assertSafeStorageKey("licenses/order-123/file.zip"),
    "licenses/order-123/file.zip",
  );
});

test("rejects traversal and unsafe storage keys", () => {
  for (const key of [
    "../secret",
    "licenses/../../secret",
    "licenses\\secret",
    "/absolute/path",
    "licenses/\0secret",
  ]) {
    assert.throws(() => assertSafeStorageKey(key), /Invalid storage key/);
  }
});

test("local storage round-trips a private file", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "codegems-storage-"));
  const storage = new LocalStorageDriver(root);

  try {
    const payload = new TextEncoder().encode("private license payload");

    await storage.put("licenses/order-123/license.txt", payload);
    assert.equal(await storage.exists("licenses/order-123/license.txt"), true);
    assert.equal(
      new TextDecoder().decode(
        await storage.get("licenses/order-123/license.txt"),
      ),
      "private license payload",
    );
    assert.equal(
      await new Response(
        await storage.getStream("licenses/order-123/license.txt"),
      ).text(),
      "private license payload",
    );

    await storage.delete("licenses/order-123/license.txt");
    assert.equal(await storage.exists("licenses/order-123/license.txt"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
