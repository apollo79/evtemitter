import { EventEmitter } from "./EventEmitter.ts";
import {
    assert,
    assertRejects,
    assertStrictEquals,
    fail,
} from "https://deno.land/std@0.127.0/testing/asserts.ts";

const waitForTimeout = (
    fn: (args?: unknown[]) => void | Promise<void>,
    timeout: number,
    // deno-lint-ignore no-explicit-any
    ...args: any[]
): Promise<void> => {
    return new Promise((resolve) => {
        const timeoutId = setTimeout(
            async (args) => {
                await fn(args);

                clearTimeout(timeoutId);

                resolve();
            },
            timeout,
            ...args,
        );
    });
};

Deno.test("EventEmitter", async (ctx) => {
    type ReservedEvents = {
        reserved: string;
        reserved2: [string];
    };

    type UserEvents = {
        ping: string;
        pong: { data: string };
    };

    class Implementing extends EventEmitter<UserEvents, ReservedEvents> {
        constructor() {
            super();

            this.run();
        }

        protected async run() {
            await waitForTimeout(() => {
                this.emitReserved("reserved", "reserved");

                this.emitReserved("reserved2", ["reserved2"]);
            }, 10);
        }
    }

    await ctx.step("reserved events", async (ctx) => {
        await ctx.step("listening is possible", async () => {
            const instance = new Implementing();

            await instance.pull("reserved").then((reserved) => {
                assertStrictEquals(reserved, "reserved");
            });
        });
    });
});

type Events = {
    foo: "bar";
    bar: "bar";
    baz: undefined;
    pong: "bar";
    adjustCount: "increment" | "decrement";
};

Deno.test("EventEmitter base functions", async (ctx) => {
    /**
     * @see https://deno.land/x/event@2.0.0/test.ts
     */

    await ctx.step("on", async (ctx) => {
        await ctx.step("one event", () => {
            const target = new EventEmitter<Events>();

            target.on("foo", (detail) => {
                assertStrictEquals(detail, "bar");
            });

            target.emit("foo", "bar");
        });

        await ctx.step("multiple events", () => {
            const target = new EventEmitter<Events>();

            target.on(["foo", "bar"], (detail) => {
                assertStrictEquals(detail, "bar");
            });

            target.emit("foo", "bar");

            target.emit("bar", "bar");
        });
    });

    await ctx.step("once", () => {
        const target = new EventEmitter<Events>();

        target.once("pong", (detail) => {
            assertStrictEquals(detail, "bar");
        });

        target.emit("pong", "bar");
    });

    await ctx.step("off", async (ctx) => {
        await ctx.step("exact off", () => {
            const target = new EventEmitter<Events>();

            function foo() {
                fail();
            }

            target.on("foo", foo).on("bar", foo).on("baz", foo);

            target.off("foo", foo);

            target.off(["bar", "baz"], foo);

            target.emit("foo", "bar");
        });

        await ctx.step("offEvent", () => {
            const target = new EventEmitter<Events>();

            let i = 0;

            target.on("foo", () => i--);

            target.on("foo", () => i--);

            target.on("baz", () => (i = i + 2));

            target.on("bar", () => i++);

            target.off("foo");

            target.emit("foo", "bar");

            assertStrictEquals(i, 0);

            target.emit("bar", "bar");

            assertStrictEquals(i, 1);
        });

        await ctx.step("offEvent", () => {
            const target = new EventEmitter<Events>();

            let i = 0;

            target.on("foo", () => i--);

            target.on("bar", () => i++);

            target.emit("foo", "bar");

            assertStrictEquals(i, -1);

            target.off(["foo", "bar"]);

            target.emit("bar", "bar");

            assertStrictEquals(i, -1);
        });

        await ctx.step("offAll", () => {
            const target = new EventEmitter<Events>();

            let i = 0;

            target.on("foo", () => i++);

            target.on("bar", () => i++);

            target.off();

            target.emit("foo", "bar").emit("bar", "bar");

            assertStrictEquals(i, 0);
        });
    });

    await ctx.step("chainable", () => {
        const target = new EventEmitter<Events>();

        function foo() {
            fail();
        }

        function bar(detail: string) {
            assertStrictEquals(detail, "bar");
        }

        function barEvent(detail: CustomEvent) {
            assertStrictEquals(detail.detail, "bar");
        }

        target.on("foo", foo).off("foo", foo);

        target.emit("foo", "bar");

        target
            .once("foo", bar)
            .addEventListener("foo", barEvent)
            .emit("foo", "bar");
    });

    await ctx.step("pull", async (ctx) => {
        await ctx.step("without timeout", async () => {
            const target = new EventEmitter<Events>();

            const promise = target.pull("foo");

            await waitForTimeout(async () => {
                target.emit("foo", "bar");

                const detail = await promise;

                assertStrictEquals(detail, "bar");
            }, 10);
        });

        await ctx.step("with timeout", async (ctx) => {
            await ctx.step("should resolve", async () => {
                const target = new EventEmitter<Events>();

                const promise = target.pull("foo", 20);

                await waitForTimeout(async () => {
                    target.emit("foo", "bar");

                    const detail = await promise;

                    assertStrictEquals(detail, "bar");
                }, 10);
            });

            await ctx.step("should reject", async () => {
                const target = new EventEmitter<Events>();

                await assertRejects(() => target.pull("foo", 10));
            });
        });
    });

    await ctx.step("getListeners", async (ctx) => {
        await ctx.step("all listeners", () => {
            const target = new EventEmitter<Events>();

            const callback = () => {};

            const callback2 = () => {};

            target.once(["foo", "bar"], callback);

            target.addEventListener("foo", callback2);

            const listeners = target.getListeners();

            assertStrictEquals(listeners.size, 2);

            assert(listeners.get("foo")?.has(callback));

            assert(listeners.get("foo")?.has(callback2));

            assert(listeners.get("bar")?.has(callback));
        });

        await ctx.step("listeners of type", () => {
            const target = new EventEmitter<Events>();

            const callback = () => {};

            const callback2 = () => {};

            target.on("foo", callback);

            target.addEventListener("foo", callback2, { once: true });

            assertStrictEquals(target.getListeners("foo").size, 2);

            assert(target.getListeners("foo").has(callback));
        });

        await ctx.step("listeners are removed", () => {
            const target = new EventEmitter<Events>();

            const callback = () => {},
                callback2 = () => {},
                callback3 = () => {},
                callback4 = () => {};

            target
                .once("foo", callback)
                .on("foo", callback2)
                .addEventListener("foo", callback3, {
                    once: true,
                })
                .addEventListener("foo", callback4);

            assertStrictEquals(target.getListeners("foo").size, 4);

            target.emit("foo", "bar");

            assertStrictEquals(target.getListeners("foo").size, 2);

            target.off("foo", callback2);

            assertStrictEquals(target.getListeners("foo").size, 1);

            target.removeEventListener("foo", callback4);

            assertStrictEquals(target.getListeners("foo").size, 0);
        });
    });

    await ctx.step("dispatches events", () => {
        const target = new EventEmitter<Events>();
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
        const target = new EventEmitter<Events>();
        let count = 0;

        const cb = (ev: CustomEvent) => {
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
        const target = new EventEmitter<Events>();

        let count = 0;

        const unsubscribe = target.subscribe("adjustCount", (payload) => {
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
