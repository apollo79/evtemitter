# evtemitter

A typed Eventemitter for deno.

This EventEmitter is based on
[CustomEvents](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent).

Using EventEmitter:

```typescript
import { EventEmitter } from "https://deno.land/x/evtemitter@1.0.0/mod.ts";
import type { TypedCustomEvent } from "https://deno.land/x/evtemitter@1.0.0/mod.ts";

interface Events {
    ping: TypedCustomEvent<"ping">;
    pong: TypedCustomEvent<
        "pong",
        "pong"
    >;
    peng: TypedCustomEvent<
        "peng",
        { data: "peng" }
    >;
}

const emitter = new EventEmitter();

emitter.on("");
```
