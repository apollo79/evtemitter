// https://stackoverflow.com/questions/71224221/class-extending-eventemitter-with-type-parameter#comment125936600_71224221

export type Values<T> = T[keyof T];

export type Fn<
    Params extends readonly unknown[] = readonly unknown[],
    Result = unknown,
> = (...params: Params) => Result;

export type TypedCustomEvent<Type extends string, Detail = unknown> =
    & CustomEvent<Detail>
    & { type: Type };

export type CustomEventCallback<
    Type extends string = string,
    Detail = unknown,
> = Fn<[event: TypedCustomEvent<Type, Detail>], void>;

export type EventCallbackFromCustomEvent<
    T extends TypedCustomEvent<string, unknown>,
> = Fn<[event: T], void>;

export type CustomEventMap = Record<string, CustomEvent>;

export type EventTargetCompatible = Extract<
    Parameters<EventTarget["addEventListener"]>[1],
    Fn
>;

type OnParams = Parameters<EventEmitter["addEventListener"]>;

type CustomEventDetailParameter<
    T extends Record<string, unknown>,
    K extends keyof T,
> = (
    unknown extends T[K] ? [detail?: unknown]
        : undefined extends T[K] ? [detail?: T[K]]
        : T[K] extends never ? []
        : [detail: T[K]]
);

export class EventEmitter<
    T extends Record<string, unknown> = Record<never, never>,
> extends EventTarget {
    /**
     * @var __listeners__ A Map with all listeners, sorted by event
     */
    protected __listeners__: Map<string, Set<CustomEventCallback>> = new Map();

    static createEvent<Type extends string, Detail>(
        type: Type,
        detail?: Detail,
        init?: Omit<CustomEventInit, "detail">,
    ): TypedCustomEvent<Type, Detail> {
        const evInit = { ...init, detail };

        return new CustomEvent(type, evInit) as TypedCustomEvent<Type, Detail>;
    }

    protected getOrCreateListeners<K extends keyof T & string>(
        type: K,
    ): Set<CustomEventCallback<string, unknown>> {
        if (!this.__listeners__.has(type)) {
            this.__listeners__.set(type, new Set());
        }

        return this.__listeners__.get(type)!;
    }

    /**
     * add a callback to an event or multiple events
     * @param types the event name(s) the callback should listen to
     * @param callback the callback to execute when the event is dispatched
     * @param options event options {@link EventTarget["addEventListener"]}
     */
    // @ts-expect-error <different implementation>
    addEventListener<K extends keyof T & string>(
        types: K | K[],
        callback: CustomEventCallback<K, T[K]>,
        options?: Parameters<EventTarget["addEventListener"]>[2],
    ): this {
        const doAdd = (
            type: K,
            callback: OnParams[1],
            options?: OnParams[2],
        ) => {
            this
                .getOrCreateListeners(type)
                .add(callback as EventTargetCompatible);

            super.addEventListener(
                type,
                callback as EventTargetCompatible,
                options,
            );
        };

        if (typeof types === "string") {
            doAdd(types, callback, options);
        } else {
            types.forEach((type) => {
                doAdd(type, callback, options);
            });
        }

        return this;
    }

    on = this.addEventListener;

    /**
     * add a callback to an event only once. After that, the listener is removed.
     * @param type the event name the callback should listen to
     * @param callback the callback to execute when the event is dispatched
     * @param options event options {@link EventTarget["addEventListener"]}
     */
    once<K extends keyof T & string>(
        type: K,
        callback: CustomEventCallback<K, T[K]>,
        options?: Parameters<EventTarget["addEventListener"]>[2],
    ): this;

    /**
     * add a callback to multiple events only once. After that, the listener is removed.
     * @param types an array of the event names the callback should be listen to
     * @param callback the callback to execute when the event is dispatched
     * @param options event options {@link EventTarget["addEventListener"]}
     */
    once<K extends keyof T & string>(
        types: K[],
        callback: CustomEventCallback<K, T[K]>,
        options?: Parameters<EventTarget["addEventListener"]>[2],
    ): this;

    once<K extends keyof T & string>(
        types: K | K[],
        callback: CustomEventCallback<K, T[K]>,
        options?: Parameters<EventTarget["addEventListener"]>[2],
    ): this {
        const fixOptions: Parameters<EventTarget["addEventListener"]>[2] = {
            once: true,
        };

        if (options === undefined) {
            options = fixOptions;
        } else if (typeof options === "boolean") {
            options = {
                capture: options,
                ...fixOptions,
            };
        } else {
            Object.assign(
                options,
                fixOptions,
            );
        }

        this.addEventListener(types, callback, options);

        return this;
    }

    /**
     * remove a callback for an or multiple events or remove all callbacks for an or multiple events or even reomve all callbacks
     * @param type the optional typed event name(s)
     * @param callback the optional typed callback function to remove
     * @param options the optional options
     * @returns this
     */
    // @ts-expect-error <different implementation>
    removeEventListener<K extends keyof T & string>(
        types?: K | K[],
        callback?: CustomEventCallback<K, T[K]>,
        options?: Parameters<EventTarget["removeEventListener"]>[2],
    ): this {
        const doRemove = (
            type: K,
            optionalCallback?: CustomEventCallback<K, T[K]>,
        ) => {
            super.removeEventListener(
                type,
                (optionalCallback ?? callback) as EventTargetCompatible,
                options,
            );
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

    off = this.removeEventListener;

    /**
     * @param type the name of the event
     * @returns Dispatches a synthetic event event to target and returns true
     * if either event's cancelable attribute value is false or its preventDefault() method was not invoked,
     * and false otherwise.
     */
    dispatchEvent<K extends keyof T & string>(
        type: TypedCustomEvent<K, T[K]>,
    ): boolean {
        return super.dispatchEvent(type);
    }

    /**
     * Emit an event with given detail
     * Calls all listeners that liten to the emitted event
     * @param type name of the event
     * @param param1 the detail that should be applied to the event
     * @returns this
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
     * Alias for emit
     */
    dispatch = this.emit;

    /**
     * wait for an event to be dispatched
     * @param type the typed name of the event
     * @param timeout optional timeout
     * @returns a Promise containing event
     */
    pull<K extends keyof T & string>(
        type: K,
        timeout?: number,
    ): Promise<TypedCustomEvent<K, T[K]>> {
        return new Promise((resolve, reject) => {
            let timeoutId: number | null;

            this.addEventListener(type, (event) => {
                timeoutId && clearTimeout(timeoutId);

                resolve(event);
            }, {
                once: true,
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
        callback: Fn<CustomEventDetailParameter<T, K>, void>,
    ): Fn<[], void> {
        const fn: CustomEventCallback<K, T[K]> = ({ detail }) =>
            (callback as Fn<[T[K]], void>)(detail); // 🤔

        this.addEventListener(type, fn);

        return () => this.removeEventListener(type, fn);
    }
}

export default EventEmitter;
