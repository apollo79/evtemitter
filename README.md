# evtemitter

[![Deno](https://github.com/apollo79/evtemitter/actions/workflows/deno.yml/badge.svg)](https://github.com/apollo79/evtemitter/actions/workflows/deno.yml)
[![Deploy](https://github.com/apollo79/evtemitter/actions/workflows/deploy.yml/badge.svg)](https://github.com/apollo79/evtemitter/actions/workflows/deploy.yml)\
![Code Coverage](https://img.shields.io/static/v1?label=coverage&message=82.736%&color=yellowgreen)\
[![Total alerts](https://img.shields.io/lgtm/alerts/g/apollo79/evtemitter.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/apollo79/evtemitter/alerts/)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/apollo79/evtemitter.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/apollo79/evtemitter/context:javascript)
[![Deno](https://github.com/apollo79/evtemitter/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/apollo79/evtemitter/actions/workflows/codeql-analysis.yml)

A typed Eventemitter for [Deno](https://deno.land) and the browser.

This EventEmitter is based on
[CustomEvents](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent)
fully compatible with the standard
[EventTarget](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget),
which means, you can use `addEventListener`, `removeEventListener` and
`dispatchEvent` exactly as you are used to, and allows strong typing of events
as well as reserved events that can only be invoked from an extending class.

There are different ways to use this EventEmitter:

- You can use it without typed events, like an untyped EventEmitter:
  ```typescript
  import { EventEmitter } from "https://deno.land/x/evtemitter@2.0.0/mod.ts";

  const target = new EventEmitter();

  target.on("foo", (detail) => {
      console.log(detail); // undefined
  });

  target.emit("foo");

  target.on("bar", (detail) => {
      console.log(detail); // hello world
  });

  target.emit("bar", "hello world");
  ```

- You can use it as typed EventEmitter that provides strongly typed events and
  methods with autocompletion in you code editor.
  ```typescript
  import { EventEmitter } from "https://deno.land/x/evtemitter@2.0.0/mod.ts";

  type Events = {
      foo: undefined;
      bar: string;
  };

  const emitter = new EventEmitter<Events>();

  target.on("foo", (detail) => {
      console.log("Foo has been emitted");
  });

  // works
  target.emit("foo");

  // would throw an exception
  // target.emit("foo", "hello world");

  target.once("bar", (detail) => {
      console.log("Bar has been emitted");
  });

  // works
  target.emit("bar", "hello world");

  // would throw an exception
  // target.emit("bar", 123);
  ```

- And you can use it with reserved events, which is for example useful if you
  want to only allow to emit `message` events from anyone but in your class you
  want to emit a `connection` event. Of course, this type of emitter is also
  strongly typed and provides autocompletion:
  ```typescript
  import { EventEmitter } from "https://deno.land/x/evtemitter@2.0.0/mod.ts";

  // Events that can be emitted via `emit`, `dispatch` and `publish` and that can be listened to
  type UserEvents = {
      message: string;
  };

  // Events that can only be emitted via the protected `emitReserved` method. It is also possible to listen to these events
  type ReservedEvents = {
      connection: { name: string };
  };

  class Implementing extends EventEmitter<
      UserEvents
      ReservedEvents
  > {
      constructor() {
          super();

          // your logic here
      }

      onConnect(name: string) {
          // logic here...
          this.emitReserved("connection", { name });
      }
  }

  const target = new Implementing();

  target.addEventListener("connection", (event) => {
      const name = event.detail.name; // this is typed as a string in this example

      console.log(`${name} has connected!`);
  });

  // of course, this makes no sense in reality, it's just for showing
  target.onConnect("Apollo");

  target.pull("message").then((message) => {
      console.log(message);
  });

  target.emit("message", "hello world");

  // this would throw an exception
  // target.emit("connection", "Apollo");
  ```
