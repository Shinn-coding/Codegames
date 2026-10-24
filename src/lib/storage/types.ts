export type StoragePutOptions = {
  contentType?: string;
};

export type StorageObject = {
  key: string;
  size: number;
};

export interface StorageDriver {
  put(
    key: string,
    data: Uint8Array,
    options?: StoragePutOptions,
  ): Promise<StorageObject>;
  get(key: string): Promise<Uint8Array>;
  getStream(key: string): Promise<ReadableStream<Uint8Array>>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
