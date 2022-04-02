// import type { CustomEventMap, TypedCustomEvent } from "./EventEmitter.ts";
import {
    assertEquals,
    assertStrictEquals,
    // assertThrows,
    fail,
} from "https://deno.land/std@0.127.0/testing/asserts.ts";

import { EventEmitter } from "./EventEmitter.ts";

type Events = Record<string, unknown> & {
    ping: undefined;
    pong: string;
    peng: { data: string };
};

Deno.test("types of detail", async (ctx) => {
    await ctx.step("typed", () => {
        const emitter = new EventEmitter<Events>();

        emitter.on("ping", (detail) => {
            assertEquals(detail, undefined);
        });

        emitter.emit("ping");

        emitter.on("pong", (detail) => {
            assertEquals(detail, "hello");
        });

        emitter.emit("pong", "hello");

        emitter.on("peng", (detail) => {
            assertEquals(detail.data, "peng emitted!");
        });

        emitter.emit("peng", {
            data: "peng emitted!",
        });
    });

    await ctx.step("untyped", () => {
        const emitter = new EventEmitter();

        emitter.on("hello", (detail) => {
            assertEquals(detail, "hello");
        });

        emitter.emit("hello", "hello");
    });
});

/**
 * @see https://deno.land/x/event@2.0.0/test.ts
 */

Deno.test("on", () => {
    const ee = new EventEmitter<Events>();

    ee.on("foo", (detail) => {
        assertEquals(detail, "bar");
    });

    ee.emit("foo", "bar");
});

Deno.test("once", () => {
    const ee = new EventEmitter<Events>();

    ee.once("pong", (detail) => {
        assertEquals(detail, "bar");
    });

    ee.emit("pong", "bar");
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

    ext.on("pong", (detail) => {
        assertEquals(detail, "pong");
    });

    ext.foo();

    ext.emit("pong", "pong");
});

Deno.test("extend with custom events", () => {
    class Extending extends EventEmitter<Events> {
        foo() {
            this.emit("pong", "pong");
        }
    }

    const ext = new Extending();

    ext.on("pong", (detail) => {
        assertEquals(detail, "pong");
    });

    ext.foo();

    ext.emit("pong", "pong");
});

Deno.test("pub / sub", () => {
    const ee = new EventEmitter<Events>();

    const cleanup = ee.subscribe("pong", (detail) => {
        assertEquals<string>(detail, "hello");
    });

    ee.emit("pong", "hello");

    cleanup();

    const cleanup2 = ee.subscribe("peng", (detail) => {
        assertEquals<string>(detail.data, "hello");
    });

    ee.emit("peng", {
        data: "hello",
    });

    cleanup2();
});

// https://github.com/jsejcksn/deno-utils/blob/main/event.test.ts

Deno.test("EventEmitter.createEvent", async (ctx) => {
    await ctx.step("created event has correct property values", () => {
        const eventType = "name";
        const eventDetail = { string: "", number: NaN };
        const ev = EventEmitter.createEvent(eventType, eventDetail);

        // type-checking
        ev.type === eventType;
        ev.detail === eventDetail;

        assertStrictEquals(ev.type, eventType);
        assertStrictEquals(ev.detail, eventDetail);
    });
});

Deno.test("EventEmitter", async (ctx) => {
    type CountMap = { adjustCount: "increment" | "decrement" };

    await ctx.step("dispatches events", () => {
        const target = new EventEmitter<CountMap>();
        let count = 0;

        target.addEventListener("adjustCount", ({ detail }) => {
            count += detail === "increment" ? 1 : -1;
        });

        const incrementEvent = EventEmitter.createEvent(
            "adjustCount",
            "increment" as const,
        );

        target.dispatchEvent(incrementEvent);

        target.dispatchEvent(incrementEvent);

        target.dispatch("adjustCount", "decrement");

        target.dispatch("adjustCount", "decrement");

        target.dispatch("adjustCount", "increment");

        assertStrictEquals(count, 1);
    });

    await ctx.step('correctly implements "once" option', () => {
        const target = new EventEmitter<CountMap>();
        let count = 0;

        const cb = (ev: CustomEvent<CountMap["adjustCount"]>) => {
            count += ev.detail === "increment" ? 1 : -1;
        };

        target.addEventListener("adjustCount", cb, { once: true });

        const incrementEvent = EventEmitter.createEvent(
            "adjustCount",
            "increment" as const,
        );

        assertStrictEquals(count, 0);

        target.dispatchEvent(incrementEvent);

        assertStrictEquals(count, 1);

        target.dispatchEvent(incrementEvent);

        assertStrictEquals(count, 1);
    });

    await ctx.step('"subscribe" method returns "unsubscribe" function', () => {
        const target = new EventEmitter<CountMap>();

        let count = 0;

        const unsubscribe = target.subscribe("adjustCount", (payload) => {
            console.log("called");

            count += payload === "increment" ? 1 : -1;

            unsubscribe();
        });

        assertStrictEquals(count, 0);

        target.publish("adjustCount", "increment");

        assertStrictEquals(count, 1);

        target.publish("adjustCount", "increment");

        assertStrictEquals(count, 1);
    });
});
