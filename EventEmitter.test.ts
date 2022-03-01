import type { CustomEventMap, TypedCustomEvent } from "./EventEmitter.ts";
import {
    assertEquals,
    // assertThrows,
    fail,
} from "https://deno.land/std@0.92.0/testing/asserts.ts";

import { EventEmitter } from "./EventEmitter.ts";

interface Events extends CustomEventMap {
    ping: TypedCustomEvent<"ping", undefined>;
    pong: TypedCustomEvent<"pong", string>;
    peng: TypedCustomEvent<"peng", { data: string }>;
}

Deno.test("types of detail", () => {
    const emitter = new EventEmitter<Events>();

    emitter.on("ping", (event) => {
        assertEquals(event.detail, undefined);
    });

    emitter.emit("ping", undefined);

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
});

/**
 * @see https://deno.land/x/event@2.0.0/test.ts
 */

Deno.test("on", () => {
    const ee = new EventEmitter<Events>();

    ee.on("foo", (event) => {
        assertEquals(event.detail, "bar");
    });

    ee.emit("foo", "bar");
});

Deno.test("once", () => {
    const ee = new EventEmitter<Events>();

    ee.once("foo", (event) => {
        assertEquals(event.detail, "bar");
    });

    ee.emit("foo", "bar");
});

Deno.test("off", () => {
    const ee = new EventEmitter<Events>();

    function foo() {
        fail();
    }

    ee.on("foo", foo);

    ee.off("foo", foo);

    ee.emit("foo", "bar");
});

Deno.test("offEvent", () => {
    const ee = new EventEmitter<Events>();

    let i = 0;

    ee.on("foo", () => i++);

    ee.on("foo", () => i++);

    ee.off();

    ee.emit("foo", "bar");

    assertEquals(i, 0);
});

Deno.test("offAll", () => {
    const ee = new EventEmitter<Events>();

    let i = 0;

    ee.on("foo", () => i++);

    ee.on("bar", () => i++);

    ee.off();

    ee.emit("foo", "bar");

    assertEquals(i, 0);
});

Deno.test("chainable", () => {
    const ee = new EventEmitter<Events>();

    function foo() {
        fail();
    }

    ee
        .on("foo", foo)
        .off("foo", foo);

    ee.emit("foo", "bar");
});

Deno.test("extend", () => {
    class Extending extends EventEmitter<Events> {
        foo() {
            this.emit("pong", "pong");
        }
    }

    const ext = new Extending();

    ext.on("pong", (event) => {
        assertEquals(event.detail, "pong");
    });

    ext.foo();

    ext.emit("pong", "pong");
});

Deno.test("extend with custom events", () => {
    class Extending<E extends CustomEventMap = Record<never, never>>
        extends EventEmitter<Exclude<E, Events> & Events> {
        foo() {
            this.emit("pong", "pong");
        }
    }

    const ext = new Extending();

    ext.on("pong", (event) => {
        assertEquals(event.detail, "pong");
    });

    ext.foo();

    ext.emit("pong", "pong");
});
