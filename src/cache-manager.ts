import * as hash from "object-hash";
import { ICacheItem } from "./cache-item";
import { ICacheOptions } from "./cache-options";
import { ICachePolicy } from "./cache-policy";
import { ICacheStorage } from "./cache-storage";
import { MemoryCache } from "./memory-cache";

/** Manages a cache system and policies. */
export class CacheManager {
    private _policies: { [hash: string]: ICachePolicy } = {};

    private _contexts: { [context: string]: Set<string> } = {};

    constructor(public storage: ICacheStorage) { }

    /**
     * Sets the cache policy for the specified policy key.
     * @param policyKey A unique key to identify a cache policy.
     * @param policy A cache policy that is associated with the unique key.
     */
    public setCachePolicy(policyKey: unknown, policy: ICachePolicy): void {
        this._policies[this.getHash(policyKey)] = policy;
    }

    /**
     * Gets an unexpired item from the cache.
     * @param key A unique key to identify a cache item.
     * @returns A cache item if it exists and has not expired; otherwise, undefined.
     */
    public getCacheItem(key: unknown): ICacheItem | undefined {
        const keyHash = this.getHash(key);
        const cacheItem = this.storage.get(keyHash);
        if (!cacheItem) {
            return undefined;
        }

        const now = new Date();
        if (this.expired(cacheItem, now)) {
            this.storage.remove(keyHash);
            return undefined;
        }

        cacheItem.accessed = now;
        return cacheItem;
    }

    /**
     * Saves an item to the cache.
     * @param cacheItem An item to be saved to the cache.
     */
    public setCacheItem(cacheItem: ICacheItem): void {
        const keyHash = this.getHash(cacheItem.key);
        this.storage.set(keyHash, cacheItem);
        const { context } = cacheItem;
        if (typeof context === "string") {
            let hashes = this._contexts[context];
            if (!hashes) {
                this._contexts[context] = hashes = new Set();
            }

            hashes.add(keyHash);
        }
    }

    /**
     * Determines whether the cache contains an item with the specified key.
     * @param key A unique key to identify a cache item.
     * @returns True if the cache contains an item with the specified key; otherwise, false.
     */
    public has(key: unknown): boolean {
        const keyHash = this.getHash(key);
        const cacheItem = this.storage.get(keyHash);
        return !!cacheItem && !this.expired(cacheItem);
    }

    /**
     * Gets a cached value.
     * @param key A unique key to identify a cache item.
     * @returns A cached value.
     */
    public get(key: unknown): unknown {
        const cacheItem = this.getCacheItem(key);
        return cacheItem ? cacheItem.value : undefined;
    }

    /**
     * Saves a value to the cache.
     * @param key A unique key to identify a cache item.
     * @param value A value to be cached.
     * @param options Options that controls the caching behavior.
     * @param parameters Parameters that were used to get the value that will be cached (e.g. in a function call).
     */
    public set(key: unknown, value: unknown, options?: ICacheOptions, parameters?: unknown[]): void {
        const now = new Date();
        const cacheItem: ICacheItem = {
            key,
            value,
            created: now,
            accessed: now
        };

        let policy: ICachePolicy | undefined;
        if (options) {
            const { context, policyKey } = options;
            if (context) {
                cacheItem.context = typeof context === "string"
                    ? context
                    : (parameters ? context(...parameters) : context());
            }

            // First, try to use the policy key to determine what policy to use
            if (policyKey) {
                cacheItem.policyKey = typeof policyKey === "function"
                    ? (parameters ? policyKey(...parameters) : policyKey())
                    : policyKey;
                policy = this._policies[this.getHash(policyKey)];
            }

            // If no policy is found using the policy key, then use the policy directly specified in the option
            if (!policy) {
                policy = options.policy;
            }

            if (policy) {
                const maxAge = policy.maxAge;
                if (maxAge === 0) {
                    return;
                }

                cacheItem.maxAge = typeof maxAge === "number"
                    ? maxAge
                    : (parameters ? maxAge(...parameters) : maxAge());
                cacheItem.sliding = policy.sliding;
            }
        }

        const keepRejectedPromise = policy && policy.keepRejectedPromise;
        if (!keepRejectedPromise && value instanceof Promise) {
            // When the original method fails, delete rejected promise so the original method can be invoked again
            value.catch(() => this.remove(key));
        }

        this.setCacheItem(cacheItem);
    }

    /**
     * Removes an item from the cache.
     * @param key A unique key to identify a cache item.
     * @returns True if an item with the specified key existed; otherwise, false.
     */
    public remove(key: unknown): boolean {
        const keyHash = this.getHash(key);
        const cacheItem = this.storage.remove(keyHash);
        if (cacheItem) {
            const { context } = cacheItem;
            if (context) {
                this._contexts[context].delete(keyHash);
            }
        }

        return !!cacheItem;
    }

    /**
     * Removes all items with the specified context.
     * @param context The context to remove.
     */
    public removeContext(context: string): void {
        const hashes = this._contexts[context];
        if (hashes) {
            for (const keyHash of hashes) {
                this.storage.remove(keyHash);
            }

            delete this._contexts[context];
        }
    }

    /**
     * Clears the cache, removes all items.
     */
    public clear(): void {
        this.storage.clear();
        this._contexts = {};
    }

    /**
     * Wraps a target function so its results will be cached.
     * @param target A target function to be wrapped.
     * @param cacheOptions Options to control caching behavior.
     * @param getKey Optional function to get cache key from function parameters.
     */
    // eslint-disable-next-line @typescript-eslint/ban-types
    public wrap<T extends Function>(target: T, cacheOptions?: ICacheOptions, getKey?: (parameters: unknown[]) => unknown): T {
        // Save "this". In the wrapped function, "this" will be from the caller's context.
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        // tslint:disable-next-line: only-arrow-functions
        const wrapped = function (this: unknown, ...parameters: unknown[]): unknown {
            const key = getKey ? getKey(parameters) : [target.name, parameters];
            const cacheItem = self.getCacheItem(key);
            if (cacheItem) {
                return cacheItem.value;
            }

            // Call the wrapped function. "this" is from the caller's context (e.g. an class instance).
            const value = target.apply(this, parameters);

            self.set(key, value, cacheOptions, parameters);
            return value;
        };

        return wrapped as unknown as T;
    }

    /**
     * Calculates the hash of a key.
     * @param key A key to calculate hash for.
     */
    private getHash(key: unknown): string {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return typeof key === "string" ? key : hash(key as any);
    }

    /**
     * Determines whether a cache item has expired.
     * @param cacheItem The cache item to check.
     * @param time The time used to calculate the cache item's age.
     * @returns True if the cache item has expired; otherwise, false.
     */
    private expired(cacheItem: ICacheItem, time?: Date): boolean {
        if (!cacheItem.maxAge) {
            return false;
        }

        const start = cacheItem.sliding ? cacheItem.accessed : cacheItem.created;
        const age = (time || new Date()).valueOf() - start.valueOf();
        return age > cacheItem.maxAge;
    }
}

export const cacheManager = new CacheManager(new MemoryCache());
