import { env } from "@/lib/env";

import { LocalStorageDriver } from "./local";
import type { StorageDriver } from "./types";
import { VercelBlobStorageDriver } from "./vercel-blob";

let storage: StorageDriver | undefined;

export function getStorage(): StorageDriver {
  if (storage) {
    return storage;
  }

  storage =
    env.STORAGE_DRIVER === "local"
      ? new LocalStorageDriver(env.LOCAL_STORAGE_DIR)
      : new VercelBlobStorageDriver(env.BLOB_READ_WRITE_TOKEN ?? "");

  return storage;
}

export type { StorageDriver, StorageObject, StoragePutOptions } from "./types";
