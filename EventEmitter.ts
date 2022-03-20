// https://stackoverflow.com/questions/71224221/class-extending-eventemitter-with-type-parameter#comment125936600_71224221

export type Fn<
    Params extends readonly unknown[] = readonly unknown[],
    Result = unknown,
    > = (...params: Params) => Result;

export type TypedCustomEvent<Type extends string, Detail = unknown> =
    & CustomEvent<Detail>
    & { type: Type };

export type CustomEventCallbackAddEventListener<
    Type extends string = string,
    Detail = unknown,
    > = Fn<[event: TypedCustomEvent<Type, Detail>], void>;

export type CustomEventCallbackOn<
    Type extends string = string,
    Detail = unknown,
    > = Fn<[event: TypedCustomEvent<Type, Detail>["detail"]], void>;

export type EventCallbackFromCustomEvent<
    T extends TypedCustomEvent<string, unknown>,
    > = Fn<[event: T], void>;

export type CustomEventMap = Record<string, unknown>;

export type EventTargetCompatible = Extract<
    Parameters<EventTarget["addEventListener"]>[1],
    Fn
>;

type CustomEventDetailParameter<
    T extends Record<string, unknown>,
    K extends keyof T,
    > = (
        unknown extends T[K] ? [detail?: unknown]
        : undefined extends T[K] ? [detail?: T[K]]
        : T[K] extends never ? []
        : [detail: T[K]]
    );

type CustomEventListenerMap<Type extends string = string, Detail = unknown> =
    Map<
        | CustomEventCallbackOn<Type, Detail>
        | CustomEventCallbackAddEventListener<Type, Detail>,
        CustomEventCallbackAddEventListener<Type, Detail>
    >;

export class EventEmitter<T extends CustomEventMap = Record<never, never>>
    extends EventTarget {
    /**
     * @var __listeners__ A Map with all listeners, sorted by event
     */
    protected __listeners__: Map<
        string,
        // deno-lint-ignore no-explicit-any
        CustomEventListenerMap<string, any>
    > = new Map();

    static createEvent<Type extends string, Detail>(
        type: Type,
        detail?: Detail,
        init?: Omit<CustomEventInit, "detail">,
    ): TypedCustomEvent<Type, Detail> {
        const evInit = { ...init, detail };

        return new CustomEvent(type, evInit) as TypedCustomEvent<Type, Detail>;
    }

    static detailPasser<T extends CustomEventMap, K extends keyof T & string>(
        callback: CustomEventCallbackOn<K, T[K]>,
    ) {
        const call = (event: TypedCustomEvent<K, T[K]>): void => {
            callback(event.detail);
        };

        return call;
    }

    protected getOrCreateListeners<K extends keyof T & string>(
        type: K,
        // deno-lint-ignore no-explicit-any
    ): CustomEventListenerMap<K, any> {
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
    addEventListener<K extends keyof T & string>(
        type: K,
        callback: CustomEventCallbackAddEventListener<K, T[K]>,
        options?: Parameters<EventTarget["addEventListener"]>[2],
    ): this {
        super.addEventListener(
            type,
            callback as EventTargetCompatible,
            options,
        );

        this
            .getOrCreateListeners(type)
            .set(callback, callback);

        return this;
    }

    /**
     * add a callback to an event
     * @param type the event name the callback should listen to
     * @param callback the callback to execute when the event is dispatched
     * @param options event options {@link EventTarget["addEventListener"]}
     */
    on<K extends keyof T & string>(
        type: K,
        callback: CustomEventCallbackOn<K, T[K]>,
        options?: Parameters<EventTarget["addEventListener"]>[2],
    ): this;

    /**
     * add a callback to multiple events
     * @param types an array of the event names the callback should listen to
     * @param callback the callback to execute when the event is dispatched
     * @param options event options {@link EventTarget["addEventListener"]}
     */
    on<K extends keyof T & string>(
        types: K[],
        callback: CustomEventCallbackOn<K, T[K]>,
        options?: Parameters<EventTarget["addEventListener"]>[2],
    ): this;

    on<K extends keyof T & string>(
        types: K | K[],
        callback: CustomEventCallbackOn<K, T[K]>,
        options?: Parameters<EventTarget["addEventListener"]>[2],
    ) {
        const detailOnly = EventEmitter.detailPasser(callback);

        const addCallback = (type: K) => {
            super.addEventListener(
                type,
                detailOnly as EventTargetCompatible,
                options,
            );

            this
                .getOrCreateListeners(type)
                .set(callback, detailOnly);
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
    once<K extends keyof T & string>(
        type: K,
        callback: CustomEventCallbackOn<K, T[K]>,
        options?: Parameters<EventTarget["addEventListener"]>[2],
    ): this;

    /**
     * add a callback to multiple events only once. After that, the listener is removed.
     * @param types an array of the event names the callback should listen to
     * @param callback the callback to execute when the event is dispatched
     * @param options event options {@link EventTarget["addEventListener"]}
     */
    once<K extends keyof T & string>(
        types: K[],
        callback: CustomEventCallbackOn<K, T[K]>,
        options?: Parameters<EventTarget["addEventListener"]>[2],
    ): this;

    /**
     * add a callback to one or multiple events only once. After that, the listener is removed.
     * @param types an array of the event names the callback should be listen to
     * @param callback the callback to execute when the event is dispatched
     * @param options event options {@link EventTarget["addEventListener"]}
     */
    once<K extends keyof T & string>(
        types: K | K[],
        callback: CustomEventCallbackOn<K, T[K]>,
        options?: Parameters<EventTarget["addEventListener"]>[2],
    ): this {
        options ||= {};

        this.on(
            // @ts-expect-error <crazy, there are two overloads, but it is not ok for typescript>
            types, // 🤔
            callback,
            Object.assign(
                options,
                {
                    once: true,
                },
            ),
        );

        return this;
    }

    // @ts-expect-error <different implementation>
    removeEventListener<K extends keyof T & string>(
        type: K,
        callback:
            | CustomEventCallbackAddEventListener<K, T[K]>
            | CustomEventCallbackOn<K, T[K]>,
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

            this
                .getOrCreateListeners(type)
                .delete(callback);
        }

        return this;
    }

    /**
     * remove all EventListeners
     */
    off<K extends keyof T & string>(): this;

    /**
     * remove all EventListeners for a specific event
     * @param type the name of the event all listeners should be removed
     */
    off<K extends keyof T & string>(
        type: K
    ): this;

    /**
     * remove all EventListeners for multiple specific events
     * @param types an array of events for who all listeners should be removed
     */
    off<K extends keyof T & string>(
        types: K[]
    ): this;

    /**
     * remove a specific EventListener for a specific event
     * @param type the name of the event for that all listeners should be removed
     * @param callback the callback function to remove
     */
    off<K extends keyof T & string>(
        type: K,
        callback:
            | CustomEventCallbackOn<K, T[K]>
            | CustomEventCallbackAddEventListener<K, T[K]>,
    ): this;

    /**
     * remove a specific EventListener for multiple specific events
     * @param types an array of events for who all listeners should be removed
     * @param callback the callback function to remove
     */
    off<K extends keyof T & string>(
        types: K[],
        callback:
            | CustomEventCallbackOn<K, T[K]>
            | CustomEventCallbackAddEventListener<K, T[K]>,
    ): this;

    off<K extends keyof T & string>(
        types?: K | K[],
        callback?:
            | CustomEventCallbackOn<K, T[K]>
            | CustomEventCallbackAddEventListener<K, T[K]>,
    ): this {
        const doRemove = (
            type: K,
            optionalCallback?: CustomEventCallbackAddEventListener<K, T[K]>,
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
                    doRemove(type as K, callback);
                });
            });

            this.__listeners__.clear();
        } // remove all EventListeners for specific event(s)
        else if (types && !callback) {
            const removeAllForOneType = (type: K) => {
                const listeners = this.__listeners__.get(type);

                listeners?.forEach(listener => {
                    doRemove(type, listener);
                });

                this.__listeners__.delete(type);
            }

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

    dispatch = this.emit;

    /**
     * Emit an event with given detail
     * Calls all listeners that listen to the emitted event
     * @param type name of the event
     * @param param1 the detail that should be applied to the event
     * @returns a Promise that resolves with this
     */
    emit<K extends keyof T & string>(
        type: K,
        ...[detail]: CustomEventDetailParameter<T, K>
    ): this {
        const event = EventEmitter.createEvent(
            type,
            detail,
        );

        this.dispatchEvent(event);

        return this;
    }

    /**
     * wait for an event to be dispatched
     * @param type the typed name of the event
     */
    pull<K extends keyof T & string>(type: K): Promise<T[K]>;

    /**
     * wait for an event to be dispatched and reject after a specific amount of milliseconds
     * @param type the typed name of the event
     * @param timeout optional timeout
     */

    pull<K extends keyof T & string>(type: K, timeout: number): Promise<T[K]>;

    pull<K extends keyof T & string>(type: K, timeout?: number): Promise<T[K]> {
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
    subscribe<K extends keyof T & string>(
        type: K,
        callback: CustomEventCallbackOn<K, T[K]>,
        options?: Parameters<EventTarget["addEventListener"]>[2]
    ): Fn<never, void> {
        this.on(type, callback, options);

        return () => {
            this.off(type, callback);
        };
    }

    /**
     * Get all EventListeners for a specific Event
     * @param type the event name
     */
    getListeners<K extends keyof T & string>(
        type: K,
    ): Set<CustomEventCallbackAddEventListener | CustomEventCallbackOn>;

    /**
     * Get all EventListeners
     */
    getListeners(): Map<
        string,
        Set<CustomEventCallbackAddEventListener | CustomEventCallbackOn>
    >;

    getListeners<K extends keyof T & string>(
        type?: K,
    ):
        | Set<
            | CustomEventCallbackAddEventListener<string, unknown>
            | CustomEventCallbackOn<string, unknown>
        >
        | Map<
            string,
            Set<
                | CustomEventCallbackAddEventListener<string, unknown>
                | CustomEventCallbackOn<string, unknown>
            >
        > {
        const getListenersOfType = (type: string) => {
            const listeners = new Set<
                CustomEventCallbackAddEventListener | CustomEventCallbackOn
            >();

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
                Set<CustomEventCallbackAddEventListener | CustomEventCallbackOn>
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
}

export default EventEmitter;
