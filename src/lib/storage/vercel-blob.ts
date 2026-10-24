import {
  BlobNotFoundError,
  del,
  get,
  head,
  put,
  type GetBlobResult,
} from "@vercel/blob";

import { assertSafeStorageKey } from "./keys.ts";
import type { StorageDriver, StorageObject, StoragePutOptions } from "./types";

/**
 * Private Vercel Blob storage. Product files must never be exposed through a
 * public blob URL; downloads continue to go through the authenticated API.
 */
export class VercelBlobStorageDriver implements StorageDriver {
  private readonly token: string;

  constructor(token: string) {
    if (!token) {
      throw new Error(
        "BLOB_READ_WRITE_TOKEN is required when STORAGE_DRIVER=vercel-blob.",
      );
    }

    this.token = token;
  }

  private key(key: string): string {
    return assertSafeStorageKey(key);
  }

  async put(
    key: string,
    data: Uint8Array,
    options?: StoragePutOptions,
  ): Promise<StorageObject> {
    const pathname = this.key(key);
    const result = await put(pathname, Buffer.from(data), {
      access: "private",
      addRandomSuffix: false,
      contentType: options?.contentType,
      token: this.token,
    });

    return { key: result.pathname, size: data.byteLength };
  }

  async get(key: string): Promise<Uint8Array> {
    const result = await this.read(key);

    return new Uint8Array(await new Response(result.stream).arrayBuffer());
  }

  async getStream(key: string): Promise<ReadableStream<Uint8Array>> {
    const result = await this.read(key);

    return result.stream;
  }

  async delete(key: string): Promise<void> {
    try {
      await del(this.key(key), { token: this.token });
    } catch (error) {
      if (error instanceof BlobNotFoundError) {
        return;
      }

      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await head(this.key(key), { token: this.token });
      return true;
    } catch (error) {
      if (error instanceof BlobNotFoundError) {
        return false;
      }

      throw error;
    }
  }

  private async read(
    key: string,
  ): Promise<GetBlobResult & { statusCode: 200 }> {
    const result = await get(this.key(key), {
      access: "private",
      token: this.token,
      useCache: false,
    });

    if (!result || result.statusCode !== 200) {
      throw new BlobNotFoundError();
    }

    return result;
  }
}
