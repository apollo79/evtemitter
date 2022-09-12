import { ReservedEventEmitter } from "./ReservedEventEmitter.ts";
import {
  assertStrictEquals,
  fail,
} from "https://deno.land/std@0.127.0/testing/asserts.ts";

Deno.test("ReservedEventEmitter", async (ctx) => {
  type ReservedEvents = {
    reserved: string;
    reserved2: [string];
  };

  type EmitEvents = {
    ping: string;
    pong: { data: string };
  };

  type ListenEvents = ReservedEvents & EmitEvents;

  class Implementing extends ReservedEventEmitter<
    ListenEvents,
    EmitEvents,
    ReservedEvents
  > {
    constructor() {
      super();

      const timeout = setTimeout(() => {
        this.emitReserved("reserved", "reserved");

        this.emitReserved("reserved2", ["reserved2"]);

        clearTimeout(timeout);
      }, 10);
    }
  }

  await ctx.step("reserved events", async (ctx) => {
    await ctx.step("listening is possible", () => {
      const instance = new Implementing();

      instance.once("reserved", (reserved) => {
        assertStrictEquals("reserved", reserved);
      });
    });
  });
});

Deno.test("EventEmitter.createEvent", async (ctx) => {
  await ctx.step("created event has correct property values", () => {
    const eventType = "name";
    const eventDetail = { string: "", number: NaN };
    const ev = ReservedEventEmitter.createEvent(eventType, eventDetail);

    // type-checking
    ev.type === eventType;
    ev.detail === eventDetail;

    assertStrictEquals(ev.type, eventType);
    assertStrictEquals(ev.detail, eventDetail);
  });
});

type EmitEvents = {
  foo: "bar";
  bar: "bar";
  baz: undefined;
  pong: "bar";
  adjustCount: "increment" | "decrement";
};

class Implementing extends ReservedEventEmitter<EmitEvents, EmitEvents> {}

Deno.test("ReservedEventEmitter base functions", async (ctx) => {
  /**
   * @see https://deno.land/x/event@2.0.0/test.ts
   */

  await ctx.step("on", async (ctx) => {
    await ctx.step("one event", () => {
      const ee = new Implementing();

      ee.on("foo", (detail) => {
        assertStrictEquals(detail, "bar");
      });

      ee.emit("foo", "bar");
    });

    await ctx.step("multiple events", () => {
      const ee = new Implementing();

      ee.on(["foo", "bar"], (detail) => {
        assertStrictEquals(detail, "bar");
      });

      ee.emit("foo", "bar");

      ee.emit("bar", "bar");
    });
  });

  await ctx.step("once", () => {
    const ee = new Implementing();

    ee.once("pong", (detail) => {
      assertStrictEquals(detail, "bar");
    });

    ee.emit("pong", "bar");
  });

  await ctx.step("off", async (ctx) => {
    await ctx.step("exact off", () => {
      const ee = new Implementing();

      function foo() {
        fail();
      }

      ee.on("foo", foo).on("bar", foo).on("baz", foo);

      ee.off("foo", foo);

      ee.off(["bar", "baz"], foo);

      ee.emit("foo", "bar");
    });

    await ctx.step("offEvent", () => {
      const ee = new Implementing();

      let i = 0;

      ee.on("foo", () => i--);

      ee.on("foo", () => i--);

      ee.on("bar", () => i++);

      ee.off("foo");

      ee.emit("foo", "bar");

      assertStrictEquals(i, 0);

      ee.emit("bar", "bar");

      assertStrictEquals(i, 1);
    });

    await ctx.step("offAll", () => {
      const ee = new Implementing();

      let i = 0;

      ee.on("foo", () => i++);

      ee.on("bar", () => i++);

      ee.off();

      ee.emit("foo", "bar").emit("bar", "bar");

      assertStrictEquals(i, 0);
    });
  });

  await ctx.step("chainable", () => {
    const ee = new Implementing();

    function foo() {
      fail();
    }

    function bar(detail: string) {
      assertStrictEquals(detail, "bar");
    }

    function barEvent(detail: CustomEvent) {
      assertStrictEquals(detail.detail, "bar");
    }

    ee.on("foo", foo).off("foo", foo);

    ee.emit("foo", "bar");

    ee.once("foo", bar).addEventListener("foo", barEvent).emit("foo", "bar");
  });

  await ctx.step("dispatches events", () => {
    const target = new Implementing();
    let count = 0;

    target.addEventListener("adjustCount", ({ detail }) => {
      count += detail === "increment" ? 1 : -1;
    });

    const incrementEvent = Implementing.createEvent(
      "adjustCount",
      "increment" as const
    );

    target.dispatchEvent(incrementEvent);

    target.dispatchEvent(incrementEvent);

    target.dispatch("adjustCount", "decrement");

    target.dispatch("adjustCount", "decrement");

    target.dispatch("adjustCount", "increment");

    assertStrictEquals(count, 1);
  });

  await ctx.step('correctly implements "once" option', () => {
    const target = new Implementing();
    let count = 0;

    const cb = (ev: CustomEvent) => {
      count += ev.detail === "increment" ? 1 : -1;
    };

    target.addEventListener("adjustCount", cb, { once: true });

    const incrementEvent = Implementing.createEvent(
      "adjustCount",
      "increment" as const
    );

    assertStrictEquals(target.getListeners("adjustCount").size, 1);
    assertStrictEquals(count, 0);

    target.dispatchEvent(incrementEvent);

    assertStrictEquals(target.getListeners("adjustCount").size, 0);
    assertStrictEquals(count, 1);

    target.dispatchEvent(incrementEvent);

    assertStrictEquals(count, 1);
  });

  await ctx.step('"subscribe" method returns "unsubscribe" function', () => {
    const target = new Implementing();

    let count = 0;

    const unsubscribe = target.subscribe("adjustCount", (payload) => {
      count += payload === "increment" ? 1 : -1;

      unsubscribe();
    });

    assertStrictEquals(target.getListeners("adjustCount").size, 1);
    assertStrictEquals(count, 0);

    target.publish("adjustCount", "increment");

    assertStrictEquals(target.getListeners("adjustCount").size, 0);
    assertStrictEquals(count, 1);

    target.publish("adjustCount", "increment");

    assertStrictEquals(count, 1);
  });
});

type Events = {
  foo: "bar";
  bar: "bar";
  baz: undefined;
  pong: "bar";
  adjustCount: "increment" | "decrement";
};

Deno.test("ReservedEventEmitter base functions", async (ctx) => {
  /**
   * @see https://deno.land/x/event@2.0.0/test.ts
   */

  await ctx.step("on", async (ctx) => {
    await ctx.step("one event", () => {
      const ee = new ReservedEventEmitter<Events>();

      ee.on("foo", (detail) => {
        assertStrictEquals(detail, "bar");
      });

      ee.emit("foo", "bar");
    });

    await ctx.step("multiple events", () => {
      const ee = new ReservedEventEmitter<Events>();

      ee.on(["foo", "bar"], (detail) => {
        assertStrictEquals(detail, "bar");
      });

      ee.emit("foo", "bar");

      ee.emit("bar", "bar");
    });
  });

  await ctx.step("once", () => {
    const ee = new ReservedEventEmitter<Events>();

    ee.once("pong", (detail) => {
      assertStrictEquals(detail, "bar");
    });

    ee.emit("pong", "bar");
  });

  await ctx.step("off", async (ctx) => {
    await ctx.step("exact off", () => {
      const ee = new ReservedEventEmitter<Events>();

      function foo() {
        fail();
      }

      ee.on("foo", foo).on("bar", foo).on("baz", foo);

      ee.off("foo", foo);

      ee.off(["bar", "baz"], foo);

      ee.emit("foo", "bar");
    });

    await ctx.step("offEvent", () => {
      const ee = new ReservedEventEmitter<Events>();

      let i = 0;

      ee.on("foo", () => i--);

      ee.on("foo", () => i--);

      ee.on("bar", () => i++);

      ee.off("foo");

      ee.emit("foo", "bar");

      assertStrictEquals(i, 0);

      ee.emit("bar", "bar");

      assertStrictEquals(i, 1);
    });

    await ctx.step("offAll", () => {
      const ee = new ReservedEventEmitter<Events>();

      let i = 0;

      ee.on("foo", () => i++);

      ee.on("bar", () => i++);

      ee.off();

      ee.emit("foo", "bar").emit("bar", "bar");

      assertStrictEquals(i, 0);
    });
  });

  await ctx.step("chainable", () => {
    const ee = new ReservedEventEmitter<Events>();

    function foo() {
      fail();
    }

    function bar(detail: string) {
      assertStrictEquals(detail, "bar");
    }

    function barEvent(detail: CustomEvent) {
      assertStrictEquals(detail.detail, "bar");
    }

    ee.on("foo", foo).off("foo", foo);

    ee.emit("foo", "bar");

    ee.once("foo", bar).addEventListener("foo", barEvent).emit("foo", "bar");
  });

  await ctx.step("dispatches events", () => {
    const target = new ReservedEventEmitter<Events>();
    let count = 0;

    target.addEventListener("adjustCount", ({ detail }) => {
      count += detail === "increment" ? 1 : -1;
    });

    const incrementEvent = ReservedEventEmitter<Events>.createEvent(
      "adjustCount",
      "increment" as const
    );

    target.dispatchEvent(incrementEvent);

    target.dispatchEvent(incrementEvent);

    target.dispatch("adjustCount", "decrement");

    target.dispatch("adjustCount", "decrement");

    target.dispatch("adjustCount", "increment");

    assertStrictEquals(count, 1);
  });

  await ctx.step('correctly implements "once" option', () => {
    const target = new ReservedEventEmitter<Events>();
    let count = 0;

    const cb = (ev: CustomEvent) => {
      count += ev.detail === "increment" ? 1 : -1;
    };

    target.addEventListener("adjustCount", cb, { once: true });

    const incrementEvent = ReservedEventEmitter<Events>.createEvent(
      "adjustCount",
      "increment" as const
    );

    assertStrictEquals(target.getListeners("adjustCount").size, 1);
    assertStrictEquals(count, 0);

    target.dispatchEvent(incrementEvent);

    assertStrictEquals(target.getListeners("adjustCount").size, 0);
    assertStrictEquals(count, 1);

    target.dispatchEvent(incrementEvent);

    assertStrictEquals(count, 1);
  });

  await ctx.step('"subscribe" method returns "unsubscribe" function', () => {
    const target = new ReservedEventEmitter<Events>();

    let count = 0;

    const unsubscribe = target.subscribe("adjustCount", (payload) => {
      count += payload === "increment" ? 1 : -1;

      unsubscribe();
    });

    assertStrictEquals(target.getListeners("adjustCount").size, 1);
    assertStrictEquals(count, 0);

    target.publish("adjustCount", "increment");

    assertStrictEquals(target.getListeners("adjustCount").size, 0);
    assertStrictEquals(count, 1);

    target.publish("adjustCount", "increment");

    assertStrictEquals(count, 1);
  });
});
