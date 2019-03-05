# managed-cache
Managed cache for JavaScript/TypeScript.
The default implementation uses memory cache, but you can provide your own cache storage.

## Installation
`npm install --save managed-cache`

## Usage
### Method decorator
```typescript
import { cache } from "managed-cache";

class MyClass {
    @cache({ maxAge: 300000 /* 5 minutes */ })
    public getData(name: string): { name: string } {
        return { name };
    }
}

const obj = new MyClass();
const a = obj.getData("foobar"); // Return data from the source
const b = obj.getData("foobar"); // Return data from the cache
setTimeout(() => obj.getData("foobar") /* Return data from the source again since the cache has expired */, 300001);
```

### Wrap a function
```typescript
import { cacheManager } from "managed-cache";

function getData(name: string): { name: string } {
    return { name };
}

const cached = cacheManager.wrap(getData);
const a = cached("foobar"); // Return data from the source
const b = cached("foobar"); // Return data from the cache
```

### Override cache policy
Library authors can use the cache decorator on class methods. When libraries are used, it may be desired to have
a different cache policy.
```typescript
import { cacheManager } from "managed-cache";

// Reduce the cache duration to 1 minute
cacheManager.setCachePolicy([MyClass, "getData"], { maxAge: 60000 });
```

### Group cached data by context
Cached data that are grouped by context can be removed together. For example, when a service that process student
records deletes a student, it can remove all cached data related to that student.
```typescript
import { cache, cacheManager } from "managed-cache";

function getStudentContext(id: string): string {
    return id;
}

const studentCache = cache({ context: getStudentContext });

class StudentService {
    @studentCache
    public getStudentProfile(id: string): any {
        // Fetch and return student profile
    }

    @studentCache
    public getStudentPicture(id: string, index: number): any {
        // Fetch and return student picture
    }
}

const service = new StudentService();
service.getStudentProfile("foobar");
service.getStudentPicture("foobar", 1);
cacheManager.removeContext("foobar"); // Both the profile and the picture will be removed from the cache
```

### Rejected promises
When a cached promise is rejected, by default it will be removed from the cache. Thus, subsequent calls will get data
from the source again. If you want to keep the rejected promise cached until it expires,
you can set `keepRejectedPromise` to `true` (default is `false`).
```typescript
import { cacheManager } from "managed-cache";

async function getData(name: string): Promise<string> {
    return Promise.reject(new Error("Rejected"));
}

const cached = cacheManager.wrap(getData, { keepRejectedPromise: true });
const a = cached("foobar"); // Invoke getData and return a rejected promise
const b = cached("foobar"); // Return the cached rejected promise directly
```