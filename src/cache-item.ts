/** Contains information about a cached value. */
export interface ICacheItem {
    /** A unique key to identify the value. */
    key: unknown;

    /** The value that is being cached. */
    value: unknown;

    /** The context of the item. */
    context?: string;

    /** A unique key to identify the cache policy. If omitted, the item never expires. */
    policyKey?: unknown;

    /** The max age of the item before it expires. If not provided, it will never expire. */
    maxAge?: number;

    /**
     * Whether to reset the age of the item whenever it is accessed.
     * If true, the item age starts from the last accessed time, instead of creation time.
     */
    sliding?: boolean;

    /** The time when the item was created. */
    created: Date;

    /** The time when the item was last accessed. */
    accessed: Date;
}
