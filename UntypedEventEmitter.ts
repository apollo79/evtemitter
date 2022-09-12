// deno-lint-ignore-file no-explicit-any
import {
    EventTargetCompatible,
    EvName,
    Fn,
    TypedCustomEvent,
} from "./types.ts";

export type CallbackAddEventListener = Fn<[event: CustomEvent], void>;

export type CallbackOn = Fn<any[], void>;

export type EventMap = Map<
    CallbackAddEventListener | CallbackOn,
    CallbackAddEventListener
>;

export class UntypedEventEmitter extends EventTarget {
    /**
     * @var __listeners__ A Map with all listeners, sorted by event
     * the EventMap contains the listeners, the key is the callback, the user added
     * (it can be a function, that only gets called with the detail of the event or a function (passed to `on` or `once`),
     * but also a "valid" callback, if it was passed to `addEventListener`), the value is the callback, that is added to the EventTarget
     * (a function that expects the detail of the event as parameter, and optionally removes the callback from this Map, if it was passed to `once` or
     * `addEventListener` with the `once` argument to true, or pass the detail to the real callback)
     */
    protected __listeners__: Map<EvName, EventMap> = new Map();

    static createEvent<Ev extends EvName, Detail>(
        type: Ev,
        detail?: Detail,
        init?: Omit<CustomEventInit, "detail">,
    ): TypedCustomEvent<Ev, Detail> {
        const evInit = { ...init, detail };

        return new CustomEvent(type, evInit) as TypedCustomEvent<Ev, Detail>;
    }

    protected detailPasser(callback: Fn) {
        const call = (event: CustomEvent): void => {
            callback(event.detail);
        };

        return call;
    }

    protected onceRemover(type: EvName, callback: CallbackAddEventListener) {
        const cb = (event: CustomEvent): void => {
            callback(event);

            this.removeEventListener(type, callback);
        };

        return cb;
    }

    protected getOrCreateListeners(type: EvName): EventMap {
        if (!this.__listeners__.has(type)) {
            this.__listeners__.set(type, new Map());
        }

        return this.__listeners__.get(type)!;
    }

    /**
     * add a callback to an event or multiple events
     * @param type the event name the callback should listen to
     * @param callback the callback to execute when the event is dispatched
     * @param options event options {@link EventTarget["addEventListener"]}
     */
    // @ts-expect-error <different implementation>
    addEventListener(
        type: EvName,
        callback: CallbackAddEventListener,
        options?: boolean | AddEventListenerOptions,
    ): this {
        let withOnce = callback;

        if (typeof options !== "boolean" && options?.once) {
            withOnce = this.onceRemover(type, callback);
        }

        super.addEventListener(
            type,
            withOnce as EventTargetCompatible,
            options,
        );

        this.getOrCreateListeners(type).set(callback, withOnce);

        return this;
    }

    /**
     * add a callback to an event
     * @param type the event name the callback should listen to
     * @param callback the callback to execute when the event is dispatched
     * @param options event options {@link EventTarget["addEventListener"]}
     */
    on(
        type: EvName,
        callback: CallbackOn,
        options?: boolean | AddEventListenerOptions,
    ): this;

    /**
     * add a callback to multiple events
     * @param types an array of the event names the callback should listen to
     * @param callback the callback to execute when the event is dispatched
     * @param options event options {@link EventTarget["addEventListener"]}
     */
    on(
        types: EvName[],
        callback: CallbackOn,
        options?: boolean | AddEventListenerOptions,
    ): this;

    on(
        types: EvName | EvName[],
        callback: CallbackOn,
        options?: boolean | AddEventListenerOptions,
    ) {
        const detailOnly = this.detailPasser(callback);

        const addCallback = (type: EvName) => {
            let withOnce = detailOnly;

            if (typeof options !== "boolean" && options?.once) {
                withOnce = this.onceRemover(type, detailOnly);
            }

            // if we call this.addEventListener, the callback will be added two times to the __listeners__ Map
            super.addEventListener(
                type,
                detailOnly as EventTargetCompatible,
                options,
            );

            this.getOrCreateListeners(type).set(callback, withOnce);
        };

        if (typeof types === "string") {
            addCallback(types);
        } else {
            types.forEach((type) => {
                addCallback(type);
            });
        }

        return this;
    }

    /**
     * add a callback to an event only once. After that, the listener is removed.
     * @param type the event name the callback should listen to
     * @param callback the callback to execute when the event is dispatched
     * @param options event options {@link EventTarget["addEventListener"]}
     */
    once(
        type: EvName,
        callback: CallbackOn,
        options?: boolean | AddEventListenerOptions,
    ): this;

    /**
     * add a callback to multiple events only once. After that, the listener is removed.
     * @param types an array of the event names the callback should listen to
     * @param callback the callback to execute when the event is dispatched
     * @param options event options {@link EventTarget["addEventListener"]}
     */
    once(
        types: EvName[],
        callback: CallbackOn,
        options?: boolean | AddEventListenerOptions,
    ): this;

    /**
     * add a callback to one or multiple events only once. After that, the listener is removed.
     * @param types an array of the event names the callback should be listen to
     * @param callback the callback to execute when the event is dispatched
     * @param options event options {@link EventTarget["addEventListener"]}
     */

    once(
        types: EvName | EvName[],
        callback: CallbackOn,
        options?: boolean | AddEventListenerOptions,
    ): this {
        options ||= {};

        this.on(
            // @ts-expect-error <crazy, there are two overloads, but it is not ok for typescript>
            types,
            callback,
            Object.assign(options, {
                once: true,
            }),
        );

        return this;
    }

    // @ts-expect-error <different implementation>
    removeEventListener(
        type: EvName,
        callback: CallbackAddEventListener | CallbackOn,
        options?: Parameters<EventTarget["removeEventListener"]>[2],
    ): this {
        const realCb = this.__listeners__.get(type)?.get(callback);

        if (realCb) {
            super.removeEventListener(
                type,
                this.__listeners__.get(type)!.get(
                    callback,
                )! as EventTargetCompatible,
                options,
            );

            this.getOrCreateListeners(type).delete(callback);
        }

        return this;
    }

    /**
     * remove all EventListeners
     */
    off(): this;

    /**
     * remove all EventListeners for a specific event
     * @param type the name of the event all listeners should be removed
     */
    off(type: EvName): this;

    /**
     * remove all EventListeners for multiple specific events
     * @param types an array of events for who all listeners should be removed
     */
    off(types: EvName[]): this;

    /**
     * remove a specific EventListener for a specific event
     * @param type the name of the event for that all listeners should be removed
     * @param callback the callback function to remove
     */
    off(type: EvName, callback: CallbackAddEventListener | CallbackOn): this;

    /**
     * remove a specific EventListener for multiple specific events
     * @param types an array of events for who all listeners should be removed
     * @param callback the callback function to remove
     */
    off(types: EvName[], callback: CallbackAddEventListener | CallbackOn): this;

    off(
        types?: EvName | EvName[],
        callback?: CallbackAddEventListener | CallbackOn,
    ): this {
        const doRemove = (
            type: EvName,
            optionalCallback?: CallbackAddEventListener,
        ) => {
            const cb = optionalCallback ?? callback;

            if (cb) {
                this.removeEventListener(type, cb);
            }
        };

        // remove all EventListeners
        if (!types && !callback) {
            this.__listeners__.forEach((map, type) => {
                map.forEach((_value, callback) => {
                    doRemove(type, callback);
                });
            });

            this.__listeners__.clear();
        } // remove all EventListeners for specific event(s)
        else if (types && !callback) {
            const removeAllForOneType = (type: EvName) => {
                const listeners = this.__listeners__.get(type);

                listeners?.forEach((_listener, realCb) => {
                    doRemove(type, realCb);
                });

                this.__listeners__.delete(type);
            };

            if (typeof types === "string") {
                removeAllForOneType(types);
            } else {
                types.forEach((type) => {
                    removeAllForOneType(type);
                });
            }
        } // remove specific EventListener for specific event(s)
        else if (types && callback) {
            if (typeof types === "string") {
                doRemove(types);
            } else {
                types.forEach((type) => {
                    doRemove(type);
                });
            }
        } // unknown case
        else {
            throw new Error("Unknown case for removing event!");
        }

        return this;
    }

    /**
     * @param type the name of the event
     * @returns Dispatches a synthetic event event to target and returns true
     * if either event's cancelable attribute value is false or its preventDefault() method was not invoked,
     * and false otherwise.
     */
    dispatchEvent<E extends Event>(type: E): boolean {
        return super.dispatchEvent(type);
    }

    /**
     * Alias for emit
     */
    dispatch = this.emit;

    /**
     * Emit an event with given detail
     * Calls all listeners that listen to the emitted event
     * @param type name of the event
     * @param param1 the detail that should be applied to the event
     * @returns a Promise that resolves with this
     */
    emit(type: EvName, ...[detail]: any): this {
        const event = UntypedEventEmitter.createEvent(type, detail);

        this.dispatchEvent(event);

        return this;
    }

    /**
     * wait for an event to be dispatched
     * @param type the typed name of the event
     */
    pull(type: EvName): Promise<any>;

    /**
     * wait for an event to be dispatched and reject after a specific amount of milliseconds
     * @param type the typed name of the event
     * @param timeout optional timeout
     */

    pull(type: EvName, timeout: number): Promise<any>;

    pull(type: EvName, timeout?: number): Promise<any> {
        return new Promise((resolve, reject) => {
            let timeoutId: number | null;

            this.once(type, (event) => {
                timeoutId && clearTimeout(timeoutId);

                resolve(event);
            });

            if (timeout) {
                timeoutId = setTimeout(() => {
                    clearTimeout(timeoutId!);

                    reject("Timed out!");
                });
            }
        });
    }

    /**
     * same as emit. Used for pub / sub conventions
     */
    publish = this.emit;

    /**
     * Subscribe method.
     * Returns a cleanup function to remove the added EventListener
     * @param type the event name the callback should listen to
     * @param callback the callback to execute when the event is dispatched
     * @param options event options {@link EventTarget["addEventListener"]}
     * @returns cleanup function
     */
    subscribe(
        type: EvName,
        callback: CallbackOn,
        options?: boolean | AddEventListenerOptions,
    ): Fn<never, void> {
        this.on(type, callback, options);

        return () => {
            this.off(type, callback);
        };
    }

    /**
     * once does not work with getListeners because it doesn't remove the callback from the listener Map
     */

    /**
     * Get all EventListeners for a specific Event
     * @param type the event name
     */
    getListeners(type: EvName): Set<CallbackAddEventListener | CallbackOn>;

    /**
     * Get all EventListeners
     */
    getListeners(): Map<string, Set<CallbackAddEventListener | CallbackOn>>;

    getListeners(
        type?: EvName,
    ):
        | Set<CallbackAddEventListener | CallbackOn>
        | Map<string, Set<CallbackAddEventListener | CallbackOn>> {
        const getListenersOfType = (type: string) => {
            const listeners = new Set<CallbackAddEventListener | CallbackOn>();

            const listenersSet = this.__listeners__.get(type);

            if (listenersSet) {
                for (const listener of listenersSet.values()) {
                    listeners.add(listener);
                }
            }

            return listeners;
        };

        if (!type) {
            const listeners = new Map<
                string,
                Set<CallbackAddEventListener | CallbackOn>
            >();

            const entries = this.__listeners__.entries();

            // console.log(entries, this.__listeners__);

            for (const [type] of entries) {
                // console.log(type);

                listeners.set(type, getListenersOfType(type));
            }

            return listeners;
        }

        return getListenersOfType(type);
    }

    listeners = this.getListeners;
}

export default UntypedEventEmitter;
