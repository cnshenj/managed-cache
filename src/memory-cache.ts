import { ICacheItem } from "./cache-item";
import { ICacheStorage } from "./cache-storage";

/** A cache manager which uses memory as storage. */
export class MemoryCache implements ICacheStorage {
    /** The cache storage. */
    private _cache: { [hash: string]: ICacheItem } = {};

    /** @inheritdoc */
    public has(hash: string): boolean {
        return hash in this._cache;
    }

    /** @inheritdoc */
    public get(hash: string): ICacheItem | undefined {
        return this._cache[hash];
    }

    /** @inheritdoc */
    public set(hash: string, cacheItem: ICacheItem): void {
        this._cache[hash] = cacheItem;
    }

    /** @inheritdoc */
    public remove(hash: string): ICacheItem | undefined {
        const item = this._cache[hash];
        if (!item) {
            return undefined;
        }

        delete this._cache[hash];
        return item;
    }

    /** @inheritdoc */
    public clear(): void {
        this._cache = {};
    }
}
