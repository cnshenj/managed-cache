import { cacheManager } from "./cache-manager";
import { ICacheOptions } from "./cache-options";

/**
 * Decorates a class method so its result will be cached.
 * @param policy The optional cache policy.
 * @param target The target being decorated. It should be a class instance.
 * @param propertyName The name of the property being decorated.
 * @param descriptor The descriptor of the property being decorated.
 */
function cacheDecorator(
    options: ICacheOptions | undefined,
    // tslint:disable-next-line: ban-types
    target: Object,
    propertyName: string | symbol,
    descriptor: PropertyDescriptor): PropertyDescriptor {

    // Save a copy of the method being decorated
    const method = descriptor.value;

    // By default, cache policy is determined by the which method is being wrapped
    const cacheOptions = { policyKey: [target.constructor, propertyName] };
    Object.assign(cacheOptions, options);
    descriptor.value = cacheManager.wrap(
        method,
        cacheOptions,
        parameters => [target.constructor, propertyName, ...parameters]);

    return descriptor;
}

export function cache(options?: ICacheOptions): MethodDecorator {
    return cacheDecorator.bind(undefined, options);
}
