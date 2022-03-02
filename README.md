# evtemitter

[![Deno](https://github.com/apollo79/evtemitter/actions/workflows/deno.yml/badge.svg)](https://github.com/apollo79/evtemitter/actions/workflows/deno.yml)\
[![Deploy](https://github.com/apollo79/evtemitter/actions/workflows/deploy.yml/badge.svg)](https://github.com/apollo79/evtemitter/actions/workflows/deploy.yml)\
![rusty_v8](https://img.shields.io/github/workflow/status/denoland/rusty_v8/ci/main?label=rusty_v8&logo=github)\
[![Deno](https://img.shields.io/github/workflow/status/denoland/deno_lint/ci/main?label=deno_lint&logo=github)](https://github.com/apollo79/evtemitter/actions/workflows/deno.yml)

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
