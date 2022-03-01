# evtemitter

[![Deno](https://img.shields.io/github/workflow/status/denoland/deno/ci/main?label=deno&logo=github)](https://github.com/apollo79/evtemitter/actions/workflows/deno.yml)\
![rusty_v8](https://img.shields.io/github/workflow/status/denoland/rusty_v8/ci/main?label=rusty_v8&logo=github)\
[![Deno](https://img.shields.io/github/workflow/status/denoland/deno_lint/ci/main?label=deno_lint&logo=github)](https://github.com/apollo79/evtemitter/actions/workflows/deno.yml)

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
