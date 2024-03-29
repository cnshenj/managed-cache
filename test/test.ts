import { cache } from "../src/cache-decorator";
import { cacheManager } from "../src/cache-manager";

const testName = "foobar";
function getMaxAge(name: unknown): number {
    return name === testName ? 100 : 150;
}

const testContext = "world";
function getContext(name: unknown): string | undefined {
    return name === testName ? testContext : undefined;
}

function getThisContext(this: TestClass): string | undefined {
    return this.source;
}

const customCache = cache({ context: getContext, policy: { maxAge: getMaxAge } });
const thisContextCache = cache({ context: getThisContext });

class TestClass {
    public category = "test";

    constructor(public readonly source = "unknown") { }

    @customCache
    public getData(name: string, count: number): { name: string, count: number, category: string } {
        return { name, count, category: this.category };
    }

    @thisContextCache
    public getData2(name: string, count: number): { name: string, count: number, category: string } {
        return { name, count, category: this.category };
    }
}

async function wait(duration: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(() => resolve(), duration);
    });
}

const methodName = "getData";
const testObject = new TestClass();

test("Clear cache", () => {
    const data = testObject.getData(testName, 10);
    const cached = testObject.getData(testName, 10);
    expect(cached).toBe(data);
    cacheManager.clear();
    const newValue = testObject.getData(testName, 10);
    expect(newValue).not.toBe(data);
});

test("Check existence of cached data", () => {
    cacheManager.clear();
    testObject.getData(testName, 10);
    const exists = cacheManager.has([TestClass, methodName, testName, 10]);
    expect(exists).toBe(true);
});

test("Get cached data", () => {
    cacheManager.clear();
    const data = testObject.getData(testName, 10);
    const cached = testObject.getData(testName, 10);
    expect(cached).toBe(data);
    expect(cached).toEqual({ name: testName, count: 10, category: testObject.category });
});

test("Cache shared by 2 instances", () => {
    cacheManager.clear();
    const data = testObject.getData(testName, 10);
    const another = new TestClass();
    const cached = another.getData(testName, 10);
    expect(cached).toBe(data);
});

test("Different parameters cached separately", () => {
    cacheManager.clear();
    const x = testObject.getData(testName, 10);
    const y = testObject.getData(testName + 1, 20);
    expect(y).not.toEqual(x);
});

test("Remove cached data", () => {
    cacheManager.clear();
    const data = testObject.getData(testName, 10);
    const cached = testObject.getData(testName, 10);
    expect(cached).toBe(data);
    const success = cacheManager.remove([TestClass, methodName, testName, 10]);
    const newValue = testObject.getData(testName, 10);
    expect(success).toBe(true);
    expect(newValue).not.toBe(data);
});

test("Set context of cached data", () => {
    cacheManager.clear();
    const anotherName = testName + 1;
    testObject.getData(testName, 10);
    testObject.getData(anotherName, 10);
    expect(cacheManager.has([TestClass, methodName, testName, 10])).toBe(true);
    expect(cacheManager.has([TestClass, methodName, anotherName, 10])).toBe(true);
    cacheManager.removeContext(testContext);
    expect(cacheManager.has([TestClass, methodName, testName, 10])).toBe(false);
    expect(cacheManager.has([TestClass, methodName, anotherName, 10])).toBe(true);
});

test("Set context of cached data using 'this'", () => {
    cacheManager.clear();
    const myMethodName = "getData2";
    const myContext = "my";
    const myObject = new TestClass(myContext);
    const anotherName = testName + 1;
    myObject.getData2(testName, 10);
    myObject.getData2(anotherName, 10);
    expect(cacheManager.has([TestClass, myMethodName, testName, 10])).toBe(true);
    expect(cacheManager.has([TestClass, myMethodName, anotherName, 10])).toBe(true);
    cacheManager.removeContext(myContext);
    expect(cacheManager.has([TestClass, myMethodName, testName, 10])).toBe(false);
    expect(cacheManager.has([TestClass, myMethodName, anotherName, 10])).toBe(false);
});

test("Cached data expire according to policy", async () => {
    expect.assertions(4);

    cacheManager.clear();
    let data = testObject.getData(testName, 10);
    await wait(80);
    let cached = testObject.getData(testName, 10);
    expect(cached).toBe(data);

    // 80 + 21 = 101, greater than max age 100 for Jack
    await wait(21);
    let newValue = testObject.getData(testName, 10);
    expect(newValue).not.toBe(data);

    // Different parameters which use a different policy
    const anotherName = testName + 1;
    data = testObject.getData(anotherName, 10);
    await wait(110);
    cached = testObject.getData(anotherName, 10);
    expect(cached).toBe(data);

    // 110 + 41 = 151, greater than max age 150 for anyone that is not Jack
    await wait(41);
    newValue = testObject.getData(anotherName, 10);
    expect(newValue).not.toBe(data);
});

test("Cached data expire according to overridden policy", async () => {
    expect.assertions(3);

    cacheManager.clear();
    cacheManager.setCachePolicy([TestClass, methodName], { maxAge: 200 });

    const data = testObject.getData(testName, 10);
    await wait(90);
    const cached = testObject.getData(testName, 10);
    expect(cached).toBe(data);

    // 90 + 11 = 101, greater than old max age 100, but less than new max age 200
    await wait(11);
    let newValue = testObject.getData(testName, 10);
    expect(newValue).toBe(data);

    // 101 + 100 = 201, greater than new max age 200
    await wait(100);
    newValue = testObject.getData(testName, 10);
    expect(newValue).not.toBe(data);
});

test("Reset sliding cache age when accessed", async () => {
    expect.assertions(3);

    cacheManager.clear();
    cacheManager.setCachePolicy([TestClass, methodName], { maxAge: 100, sliding: true });

    const data = testObject.getData(testName, 10);
    await wait(80);

    // Cache age reset to 0 when accessed
    const cached = testObject.getData(testName, 10);
    expect(cached).toBe(data);

    // 80 + 80 = 160, greater than max age 100, but cache age was reset at 90, so it has not expired yet
    await wait(80);
    let newValue = testObject.getData(testName, 10);
    expect(newValue).toBe(data);

    // Cache age was reset to 0 again due to last access, wait another 101 ms for it to expire
    await wait(101);
    newValue = testObject.getData(testName, 10);
    expect(newValue).not.toBe(data);
});

function getData(name: string, count: number): { name: string, count: number } {
    return { name, count };
}

test("Wrap a function", async () => {
    const wrapped = cacheManager.wrap(getData);
    const data = wrapped(testName, 10);
    const cached = wrapped(testName, 10);
    expect(cached).toBe(data);
    const another = wrapped(testName + 1, 10);
    expect(another).not.toEqual(data);
});
