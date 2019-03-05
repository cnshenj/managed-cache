import { ICachePolicy } from "./cache-policy";

/** Options to control the caching behavior. */
export interface ICacheOptions {
    /**
     * A string context, or a function that returns a string context.
     * Contexts are used to group cached data. Items with the same context can be removed together easily.
     */
    context?: string | ((...parameters: any[]) => string | undefined);

    /** A key used to find cache policy. Or, a function to get a policy key. */
    policyKey?: any;

    /**
     * The cache policy to be used.
     * If a policy is found using @see policyKey, then that policy will be used, and this property is ignored.
     */
    policy?: ICachePolicy;
}
