import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { assertSafeStorageKey } from "./keys.ts";
import type { StorageDriver, StorageObject } from "./types";

export { assertSafeStorageKey } from "./keys.ts";

/**
 * Private local storage. Files must never be served directly from the
 * `storage/` directory; download them through an authenticated API route.
 */
export class LocalStorageDriver implements StorageDriver {
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private resolve(key: string): string {
    const safeKey = assertSafeStorageKey(key);
    const fullPath = path.resolve(this.root, safeKey);

    if (
      fullPath !== this.root &&
      !fullPath.startsWith(`${this.root}${path.sep}`)
    ) {
      throw new Error("Invalid storage key");
    }

    return fullPath;
  }

  async put(key: string, data: Uint8Array): Promise<StorageObject> {
    const fullPath = this.resolve(key);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, data);

    return { key, size: data.byteLength };
  }

  async get(key: string): Promise<Uint8Array> {
    return readFile(this.resolve(key));
  }

  async getStream(key: string): Promise<ReadableStream<Uint8Array>> {
    const fullPath = this.resolve(key);
    await stat(fullPath);

    return Readable.toWeb(
      createReadStream(fullPath),
    ) as ReadableStream<Uint8Array>;
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await stat(this.resolve(key));
      return true;
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return false;
      }
      throw error;
    }
  }
}
