import { ICacheItem } from "./cache-item";

/** Provides storage for cache items. */
export interface ICacheStorage {
    /**
     * Gets an item from the cache.
     * @param hash A unique hash to identify a cache item.
     * @returns A cache item if it exists; otherwise, undefined.
     */
    get(hash: string): ICacheItem | undefined;

    /**
     * Saves an item to the cache.
     * @param hash unique hash to identify a cache item.
     * @param cacheItem An item to be saved to the cache.
     */
    set(hash: string, cacheItem: ICacheItem): void;

    /**
     * Determines whether the cache contains an item with the specified key.
     * @param hash A unique hash to identify a cache item.
     * @returns True if the cache contains an item with the specified key; otherwise, false.
     */
    has(hash: string): boolean;

    /**
     * Removes an item from the cache.
     * @param hash A unique hash to identify a cache item.
     * @returns True if an item with the specified hash existed and was removed; otherwise, false.
     */
    remove(hash: string): ICacheItem | undefined;

    /**
     * Counts the number of valid (not expired) cache items.
     */
    count(): number

    /**
     * Clears the cache, removes all items.
     */
    clear(): void;
}
