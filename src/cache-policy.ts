/** The policy to determine how long an item should be cached. */
export interface ICachePolicy {
    /**
     * The max age of a cache item, in milliseconds.
     * Or, a function that takes parameters and returns the max age of a cache item.
     */
    maxAge: number | ((...parameters: unknown[]) => number);

    /**
     * Whether to reset the age of an item whenever it is accessed.
     * If true, the item age starts from the last access time, instead of creation time.
     */
    sliding?: boolean;

    /**
     * When a cached promise is rejected, it is usually discarded so the original method can be tried again.
     * To keep the rejected promise until it expires, set this flag to true.
     */
    keepRejectedPromise?: boolean;
}
