import { ICacheItem } from "./cache-item";

/**
 * Determines whether a cache item has expired.
 * @param cacheItem The cache item to check.
 * @param time The time used to calculate the cache item's age.
 * @returns True if the cache item has expired; otherwise, false.
 */
export function expired(cacheItem: ICacheItem, time?: Date): boolean {
    if (!cacheItem.maxAge) {
        return false;
    }

    const start = cacheItem.sliding ? cacheItem.accessed : cacheItem.created;
    const age = (time || new Date()).valueOf() - start.valueOf();
    return age > cacheItem.maxAge;
}