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

export class EventEmitter<T extends CustomEventMap = Record<never, never>>
    extends EventTarget {
    /**
     * @var __listeners__ A Map with all listeners, sorted by event
     */
    protected __listeners__: Map<
        string,
        Set<CustomEventCallbackOn>
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
    ): Set<CustomEventCallbackOn<string, any>> {
        if (!this.__listeners__.has(type)) {
            this.__listeners__.set(type, new Set());
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

        return this;
    }

    on<K extends keyof T & string>(
        types: K | K[],
        callback: CustomEventCallbackOn<K, T[K]>,
    ) {
        if (typeof types === "string") {
            this
                .getOrCreateListeners(types)
                .add(callback);
        } else {
            types.forEach((type) => {
                this
                    .getOrCreateListeners(type)
                    .add(callback);
            });
        }

        return this;
    }

    /**
     * add a callback to one or multiple events only once. After that, the listener is removed.
     * @param types an array of the event names the callback should be listen to
     * @param callback the callback to execute when the event is dispatched
     * @param options event options {@link EventTarget["addEventListener"]}
     */
    once<K extends keyof T & string>(
        types: K | K[],
        callback: CustomEventCallbackOn<K, T[K]>,
    ): this {
        this.on(
            types,
            (detail) => {
                callback(detail);

                this.off(types, callback);
            },
        );

        return this;
    }

    // @ts-expect-error <different implementation>
    removeEventListener<K extends keyof T & string>(
        type: K,
        callback: CustomEventCallbackAddEventListener<K, T[K]>,
        options?: Parameters<EventTarget["removeEventListener"]>[2],
    ): this {
        super.removeEventListener(
            type,
            callback as EventTargetCompatible,
            options,
        );

        return this;
    }

    /**
     * remove a callback for an or multiple events or remove all callbacks for an or multiple events or even reomve all callbacks
     * @param type the optional typed event name(s)
     * @param callback the optional typed callback function to remove
     * @param options the optional options
     * @returns this
     */
    off<K extends keyof T & string>(
        types?: K | K[],
        callback?: CustomEventCallbackOn<K, T[K]>,
    ) {
        const doRemove = (
            type: K,
            optionalCallback?: CustomEventCallbackOn<K, T[K]>,
        ) => {
            const cb = optionalCallback ?? callback!;

            this
                .getOrCreateListeners(type)
                .delete(cb);
        };

        // remove all EventListeners
        if (!types && !callback) {
            this.__listeners__.forEach((set, type) => {
                set.forEach((callback) => {
                    doRemove(type as K, callback);
                });
            });

            this.__listeners__ = new Map();
        } // remove all EventListeners for specific event(s)
        else if (types && !callback) {
            if (typeof types === "string") {
                doRemove(
                    types,
                );
            } else {
                types.forEach((type) => {
                    doRemove(type);
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

    dispatch<K extends keyof T & string>(
        type: K,
        ...[detail]: CustomEventDetailParameter<T, K>
    ) {
        const event = EventEmitter.createEvent(
            type,
            detail,
        );

        this.dispatchEvent(event);
    }

    /**
     * Emit an event with given detail
     * Calls all listeners that listen to the emitted event and waits for them to return
     * @param type name of the event
     * @param param1 the detail that should be applied to the event
     * @returns a Promise that resolves with this
     */
    async emit<K extends keyof T & string>(
        type: K,
        ...[detail]: CustomEventDetailParameter<T, K>
    ): Promise<this> {
        const listeners = this
            .getOrCreateListeners(type);

        for (const listener of listeners) {
            try {
                await listener(detail);
            } catch (error) {
                console.error(error);
            }
        }

        return this;
    }

    /**
     * The same as emit but without waiting for each listener to return
     * @param type name of the event
     * @param param1 the detail that should be applied to the event
     * @returns this
     */
    emitSync<K extends keyof T & string>(
        type: K,
        ...[detail]: CustomEventDetailParameter<T, K>
    ): this {
        const listeners = this
            .getOrCreateListeners(type);

        for (const listener of listeners) {
            try {
                listener(detail);
            } catch (error) {
                console.error(error);
            }
        }

        return this;
    }

    /**
     * wait for an event to be dispatched
     * @param type the typed name of the event
     * @param timeout optional timeout
     * @returns a Promise containing event
     */
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
     * @returns cleanup function
     */
    subscribe<K extends keyof T & string>(
        type: K,
        callback: CustomEventCallbackOn<K, T[K]>,
    ): Fn<never, void> {
        this.on(type, callback);

        return () => {
            this.off(type, callback);
        };
    }
}

export default EventEmitter;
