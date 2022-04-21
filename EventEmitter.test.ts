// import type { CustomEventMap, TypedCustomEvent } from "./EventEmitter.ts";
import {
    assertEquals,
    assertStrictEquals,
    // assertThrows,
    fail,
} from "https://deno.land/std@0.127.0/testing/asserts.ts";

import { CustomEventMap, EventEmitter } from "./EventEmitter.ts";
// import StrictEventEmitter, {
//     CustomEmitEventsMap,
//     CustomListenEventsMap,
// } from "./StrictEventEmitter.ts";

type Events = CustomEventMap & {
    ping: [];
    pong: [string];
    peng: [{ data: string }];
    pung: [number, string, boolean];
};

Deno.test("types of detail", async (ctx) => {
    await ctx.step("typed", () => {
        const emitter = new EventEmitter<Events>();

        emitter.on("ping", () => {
            // assertEquals(detail, undefined);
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

        emitter.on("pung", (number, string, boolean) => {
            assertEquals(number, 1);
            assertEquals(string, "hello");
            assertEquals(boolean, true);
        });

        emitter.emit("pung", 1, "hello", true);
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

// Deno.test("extend with custom events", () => {
//     StrictEventEmitter;

//     class Extending<
//         Custom extends CustomEmitEventsMap<Events>,
//         Listen extends CustomListenEventsMap<Events, Custom> = Events & Custom,
//     > extends StrictEventEmitter<Events, Custom, Listen> {
//         foo() {
//             this.emitReserved("pong", "pong");
//         }
//     }

//     const ext = new Extending<{
//         pung: string;
//     }>();

//     ext.on("pong", (detail) => {
//         assertEquals(detail, "pong");
//     });

//     ext.foo();

//     ext.emit("pong", "pong");
// });

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

Deno.test("EventEmitter", async (ctx) => {
    type CountMap = { adjustCount: ["increment" | "decrement"] };

    await ctx.step("emits / dispatches events", () => {
        const target = new EventEmitter<CountMap>();
        let count = 0;

        target.on("adjustCount", (detail) => {
            count += detail === "increment" ? 1 : -1;
        });

        target.emit("adjustCount", "increment");

        target.emit("adjustCount", "increment");

        target.dispatch("adjustCount", "decrement");

        target.dispatch("adjustCount", "decrement");

        target.dispatch("adjustCount", "increment");

        assertStrictEquals(count, 1);
    });

    await ctx.step('correctly implements "once" method', () => {
        const target = new EventEmitter<CountMap>();
        let count = 0;

        const cb = (detail: "increment" | "decrement") => {
            count += detail === "increment" ? 1 : -1;
        };

        target.once("adjustCount", cb);

        assertStrictEquals(count, 0);

        target.emit("adjustCount", "increment");

        assertStrictEquals(count, 1);

        target.emit("adjustCount", "increment");

        assertStrictEquals(count, 1);
    });

    await ctx.step('"subscribe" method returns "unsubscribe" function', () => {
        const target = new EventEmitter<CountMap>();

        let count = 0;

        const unsubscribe = target.subscribe("adjustCount", (payload) => {
            console.log("called with: ", payload);

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
