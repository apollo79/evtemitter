# evtemitter

A typed Eventemitter for deno.

This EventEmitter is based on
[CustomEvents](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent).

Using EventEmitter:

```typescript
import { EventEmitter } from "https://deno.land/x/evtemitter@1.0.0/mod.ts";
import type { TypedCustomEvent } from "https://deno.land/x/evtemitter@1.0.0/mod.ts";

const emitter = new EventEmitter<Events>();

emitter.on("ping", (event) => {
    assertEquals(event.detail, undefined);
});

emitter.emit("ping");

emitter.on("pong", (event) => {
    assertEquals(event.detail, "hello");
});

emitter.emit("pong", "hello");

emitter.on("peng", (event) => {
    assertEquals(event.detail.data, "peng emitted!");
});

emitter.emit("peng", {
    data: "peng emitted!",
});
```
