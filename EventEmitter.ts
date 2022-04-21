// https://stackoverflow.com/questions/71224221/class-extending-eventemitter-with-type-parameter#comment125936600_71224221

import { createMapEntryIfNotExistsAndGet } from "./util/createMapEntryIfNotExistsAndGet.ts";

export type Fn<
    Params extends readonly unknown[] = readonly unknown[],
    Result = unknown,
> = (...params: Params) => Result;

export type TypedCustomEvent<Type extends string, Detail = unknown> =
    & CustomEvent<Detail>
    & { type: Type };

export type CustomEventCallbackOn<
    Detail extends unknown[] = unknown[],
> = Fn<
    Detail,
    void
>;

export type CustomEventMap = Record<
    string,
    unknown[]
>;

export class EventEmitter<
    T extends CustomEventMap = CustomEventMap,
> extends EventTarget {
    /**
     * @var __listeners__ A Map with all listeners, sorted by event
     */
    protected __listeners__: Map<
        keyof T,
        Set<CustomEventCallbackOn>
    > = new Map();

    protected getOrCreateListeners<K extends keyof T & string>(
        type: K,
    ): Set<CustomEventCallbackOn> {
        return createMapEntryIfNotExistsAndGet(
            this.__listeners__,
            type,
            new Set(),
        );
    }

    static createEvent<Type extends string, Detail>(
        type: Type,
        detail?: Detail,
        init?: Omit<CustomEventInit, "detail">,
    ): TypedCustomEvent<Type, Detail> {
        const evInit = { ...init, detail };

        return new CustomEvent(type, evInit) as TypedCustomEvent<Type, Detail>;
    }

    /**
     * add a callback to an event
     * @param type the event name the callback should listen to
     * @param callback the callback to execute when the event is dispatched
     */
    on<K extends keyof T & string>(
        type: K,
        callback: CustomEventCallbackOn<T[K]>,
    ): this;

    /**
     * add a callback to multiple events
     * @param types an array of the event names the callback should listen to
     * @param callback the callback to execute when the event is dispatched
     */
    on<K extends keyof T & string>(
        types: K[],
        callback: CustomEventCallbackOn<T[K]>,
    ): this;

    on<K extends keyof T & string>(
        types: K | K[],
        callback: CustomEventCallbackOn<T[K]>,
    ) {
        const addCallback = (type: K) => {
            this
                .getOrCreateListeners(type)
                .add(callback as CustomEventCallbackOn);
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
     */
    once<K extends keyof T & string>(
        type: K,
        callback: CustomEventCallbackOn<T[K]>,
    ): this;

    /**
     * add a callback to multiple events only once. After that, the listener is removed.
     * @param types an array of the event names the callback should listen to
     * @param callback the callback to execute when the event is dispatched
     */
    once<K extends keyof T & string>(
        types: K[],
        callback: CustomEventCallbackOn<T[K]>,
    ): this;

    /**
     * add a callback to one or multiple events only once. After that, the listener is removed.
     * @param types an array of the event names the callback should be listen to
     * @param callback the callback to execute when the event is dispatched
     */
    once<K extends keyof T & string>(
        types: K | K[],
        callback: CustomEventCallbackOn<T[K]>,
    ): this {
        const cb = (...detail: T[K]) => {
            callback(...detail);

            this.off(
                // @ts-ignore <see above>
                types,
                cb,
            );
        };

        this.on(
            // @ts-expect-error <there are two overloads, but it is not for typescript>
            types,
            cb,
        );

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
        type: K,
    ): this;

    /**
     * remove all EventListeners for multiple specific events
     * @param types an array of events for who all listeners should be removed
     */
    off<K extends keyof T & string>(
        types: K[],
    ): this;

    /**
     * remove a specific EventListener for a specific event
     * @param type the name of the event for that all listeners should be removed
     * @param callback the callback function to remove
     */
    off<K extends keyof T & string>(
        type: K,
        callback: CustomEventCallbackOn<T[K]>,
    ): this;

    /**
     * remove a specific EventListener for multiple specific events
     * @param types an array of events for who all listeners should be removed
     * @param callback the callback function to remove
     */
    off<K extends keyof T & string>(
        types: K[],
        callback: CustomEventCallbackOn<T[K]>,
    ): this;

    off<K extends keyof T & string>(
        types?: K | K[],
        callback?: CustomEventCallbackOn<T[K]>,
    ): this {
        const doRemove = (
            type: K,
            callback: CustomEventCallbackOn<T[K]>,
        ) => {
            this.__listeners__.get(type)?.delete(
                callback as CustomEventCallbackOn,
            );

            console.log("removing: ", type, callback);
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

                listeners?.forEach((listener) => {
                    doRemove(type, listener);
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
                doRemove(types, callback);
            } else {
                types.forEach((type) => {
                    doRemove(type, callback);
                });
            }
        } // unknown case
        else {
            throw new Error("Unknown case for removing event!");
        }

        return this;
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
    emit<K extends keyof T & string>(
        type: K,
        ...detail: T[K]
    ): this {
        for (const listener of this.getOrCreateListeners(type)) {
            listener(...detail);
        }

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

            this.once(type, (...detail) => {
                timeoutId && clearTimeout(timeoutId);

                resolve(detail);
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
        callback: CustomEventCallbackOn<T[K]>,
    ): Fn<never, void> {
        this.on(type, callback);

        return () => {
            this.off(type, callback);
        };
    }
}

export default EventEmitter;
