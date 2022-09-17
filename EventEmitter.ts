import type {
    CustomEventDetailParameter,
    CustomEventListenerMap,
    CustomEventMap,
    EventNames,
    EventTargetCompatible,
    EvName,
    Fn,
    ReservedOrUserEventNames,
    ReservedOrUserListenerAddEventListener,
    ReservedOrUserListenerAddEventListenerParams,
    ReservedOrUserListenerOn,
    ReservedOrUserListenerOnOrAddEventListener,
    ReservedOrUserListenerOnParams,
    TypedCustomEvent,
    TypedEventBroadcaster,
} from "./types.ts";

/**
 * Strictly typed version of an `EventEmitter`. A `TypedEventEmitter` takes type
 * parameters for mappings of event names to event data types, and strictly
 * types method calls to the `EventEmitter` according to these event maps.
 *
 * @typeParam UserEvents - `CustomEventMap` of user-defined events that can be
 * listened to
 * @typeParam ReservedEvents - `CustomEventMap` of reserved events, that can be
 * emitted by an extending class with `emitReserved`, and can be listened to
 */
export class EventEmitter<
    UserEvents extends CustomEventMap = CustomEventMap,
    ReservedEvents extends CustomEventMap = Record<never, never>,
> extends EventTarget implements TypedEventBroadcaster<UserEvents> {
    /**
     * @var __listeners__ A Map with all listeners, sorted by event
     * the EventMap contains the listeners, the key is the callback, the user added
     * (it can be a function, that only gets called with the detail of the event or a function (passed to `on` or `once`),
     * but also a "valid" callback, if it was passed to `addEventListener`), the value is the callback, that is added to the EventTarget
     * (a function that expects the detail of the event as parameter, and optionally removes the callback from this Map, if it was passed to `once` or
     * `addEventListener` with the `once` argument to true, or pass the detail to the real callback)
     */
    protected __listeners__: Map<
        EvName,
        CustomEventListenerMap<ReservedEvents, UserEvents>
    > = new Map();

    /**
     * create a typed CustomEvent, which will have a typed `type` property
     * @param type The type / name of the event, will be the `type` property
     */
    static createEvent<Type extends EvName>(
        type: EvName,
    ): TypedCustomEvent<Type, undefined>;

    /**
     * create a typed CustomEvent, which will have types for the `detail` and the `type` property
     * @param type The type / name of the event, will be the `type` property
     * @param detail Optional - the detail of the event, will be the `detail` property
     * @param init Optional - a CustomEventInit object without the `detail` property
     */
    static createEvent<Type extends EvName, Detail>(
        type: EvName,
        detail: Detail,
        init?: Omit<CustomEventInit, "detail">,
    ): TypedCustomEvent<Type, Detail>;

    static createEvent<Ev extends EvName, Detail>(
        type: Ev,
        detail?: Detail,
        init?: Omit<CustomEventInit, "detail">,
    ): TypedCustomEvent<Ev, Detail> {
        const evInit = { ...init, detail };

        return new CustomEvent(type, evInit) as TypedCustomEvent<Ev, Detail>;
    }

    /**
     * Creates a wrapper function around a given callback which passes the value of the `detail` property of a CustomEvent to the callback
     * @param callback the callback to wrap
     */
    protected passOnlyDetail<
        Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>,
    >(
        callback: ReservedOrUserListenerOn<ReservedEvents, UserEvents, Ev>,
    ): ReservedOrUserListenerAddEventListener<ReservedEvents, UserEvents, Ev> {
        const call = ((
            event: ReservedOrUserListenerAddEventListenerParams<
                ReservedEvents,
                UserEvents,
                Ev
            >,
        ): void => {
            callback(event.detail);
        }) as ReservedOrUserListenerAddEventListener<
            ReservedEvents,
            UserEvents,
            Ev
        >;

        return call;
    }

    /**
     * @param callbackToCall the callback to call
     * @param callbackToRemove optional - the callback to use to remove the callback from the {@link __listeners__} Map, it must be the key in the Map.
     * It is only necessary if the callback is added via {@link on} or {@link once}, because then the key callback differs from its value
     */
    protected removeAfterOneInvocation<
        Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>,
    >(
        type: Ev,
        callbackToCall: ReservedOrUserListenerAddEventListener<
            ReservedEvents,
            UserEvents,
            Ev
        >,
        callbackToRemove: ReservedOrUserListenerOnOrAddEventListener<
            ReservedEvents,
            UserEvents,
            Ev
        > = callbackToCall,
    ): ReservedOrUserListenerAddEventListener<ReservedEvents, UserEvents, Ev> {
        const cb = ((
            event: ReservedOrUserListenerAddEventListenerParams<
                ReservedEvents,
                UserEvents,
                Ev
            >,
        ): void => {
            callbackToCall(event);

            this.removeEventListener(type, callbackToRemove);
        }) as ReservedOrUserListenerAddEventListener<
            ReservedEvents,
            UserEvents,
            Ev
        >;

        return cb;
    }

    protected getOrCreateListeners<
        Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>,
    >(type: Ev): CustomEventListenerMap<ReservedEvents, UserEvents, Ev> {
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
    // @ts-ignore <different implementation>
    addEventListener<
        Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>,
    >(
        type: Ev,
        callback: ReservedOrUserListenerAddEventListener<
            ReservedEvents,
            UserEvents,
            Ev
        >,
        options?: boolean | AddEventListenerOptions,
    ): this {
        let withOnce = callback;

        if (typeof options !== "boolean" && options?.once) {
            withOnce = this.removeAfterOneInvocation(type, callback);
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
    on<Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>>(
        type: Ev,
        callback: ReservedOrUserListenerOn<ReservedEvents, UserEvents, Ev>,
        options?: boolean | AddEventListenerOptions,
    ): this;

    /**
     * add a callback to multiple events
     * @param types an array of the event names the callback should listen to
     * @param callback the callback to execute when the event is dispatched
     * @param options event options {@link EventTarget["addEventListener"]}
     */
    on<Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>>(
        types: Ev[],
        callback: ReservedOrUserListenerOn<ReservedEvents, UserEvents, Ev>,
        options?: boolean | AddEventListenerOptions,
    ): this;

    on<Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>>(
        types: Ev | Ev[],
        callback: ReservedOrUserListenerOn<ReservedEvents, UserEvents, Ev>,
        options?: boolean | AddEventListenerOptions,
    ): this {
        const detailOnly = this.passOnlyDetail(callback);

        const addCallback = (type: Ev) => {
            let withOnce = detailOnly;

            if (typeof options !== "boolean" && options?.once) {
                withOnce = this.removeAfterOneInvocation(
                    type,
                    detailOnly,
                    callback,
                );
            }

            // if we call this.addEventListener, the callback will be added two times to the __listeners__ Map
            super.addEventListener(
                type,
                withOnce as EventTargetCompatible,
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
    once<Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>>(
        type: Ev,
        callback: ReservedOrUserListenerOn<ReservedEvents, UserEvents, Ev>,
        options?: boolean | AddEventListenerOptions,
    ): this;

    /**
     * add a callback to multiple events only once. After that, the listener is removed.
     * @param types an array of the event names the callback should listen to
     * @param callback the callback to execute when the event is dispatched
     * @param options event options {@link EventTarget["addEventListener"]}
     */
    once<Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>>(
        types: Ev[],
        callback: ReservedOrUserListenerOn<ReservedEvents, UserEvents, Ev>,
        options?: boolean | AddEventListenerOptions,
    ): this;

    once<Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>>(
        types: Ev | Ev[],
        callback: ReservedOrUserListenerOn<ReservedEvents, UserEvents, Ev>,
        options?: boolean | AddEventListenerOptions,
    ): this {
        options ||= {};

        this.on(
            // @ts-ignore <there are matching overloads, but typescript doesn't seem to recognize that>
            types,
            callback,
            Object.assign(options, {
                once: true,
            }),
        );

        return this;
    }

    // @ts-ignore <different implementation>
    removeEventListener<
        Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>,
    >(
        type: Ev,
        callback: ReservedOrUserListenerOnOrAddEventListener<
            ReservedEvents,
            UserEvents,
            Ev
        >,
        options?: boolean | EventListenerOptions,
    ): this {
        const realCb = this.__listeners__.get(type)?.get(callback);

        if (realCb) {
            super.removeEventListener(
                type,
                realCb as EventTargetCompatible,
                options,
            );

            this.__listeners__.get(type)!.delete(callback);
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
    off<Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>>(
        type: Ev,
    ): this;

    /**
     * remove all EventListeners for multiple specific events
     * @param types an array of events for who all listeners should be removed
     */
    off<Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>>(
        types: Ev[],
    ): this;

    /**
     * remove a specific EventListener for a specific event
     * @param type the name of the event for that all listeners should be removed
     * @param callback the callback function to remove
     */
    off<Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>>(
        type: Ev,
        callback: ReservedOrUserListenerOnOrAddEventListener<
            ReservedEvents,
            UserEvents,
            Ev
        >,
        options?: boolean | EventListenerOptions,
    ): this;

    /**
     * remove a specific EventListener for multiple specific events
     * @param types an array of events for who all listeners should be removed
     * @param callback the callback function to remove
     */
    off<Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>>(
        types: Ev[],
        callback: ReservedOrUserListenerOnOrAddEventListener<
            ReservedEvents,
            UserEvents,
            Ev
        >,
        options?: boolean | EventListenerOptions,
    ): this;

    off<Ev extends EventNames<UserEvents>>(
        types?: Ev | Ev[],
        callback?: ReservedOrUserListenerOnOrAddEventListener<
            ReservedEvents,
            UserEvents,
            Ev
        >,
        options?: boolean | EventListenerOptions,
    ): this {
        const doRemove = (
            type: Ev,
            optionalCallback?: ReservedOrUserListenerOnOrAddEventListener<
                ReservedEvents,
                UserEvents,
                Ev
            >,
        ) => {
            const cb = optionalCallback ?? callback;

            if (cb) {
                this.removeEventListener(type, cb, options);
            }
        };

        // remove all EventListeners
        if (!types && !callback) {
            this.__listeners__.forEach((map, type) => {
                map.forEach((_value, callback) => {
                    doRemove(type as Ev, callback);
                });
            });

            this.__listeners__.clear();
        } // remove all EventListeners for specific event(s)
        else if (types && !callback) {
            const removeAllForOneType = (type: Ev) => {
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
     * @param event the event
     * @returns Dispatches a synthetic event event to target and returns true
     * if either event's cancelable attribute value is false or its preventDefault() method was not invoked,
     * and false otherwise.
     */
    dispatchEvent<Ev extends Event>(event: Ev): boolean {
        return super.dispatchEvent(event);
    }

    /**
     * Alias for emit
     */
    dispatch = this.emit;

    protected _emit<
        Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>,
    >(
        type: Ev,
        ...[detail]: CustomEventDetailParameter<UserEvents & ReservedEvents, Ev>
    ): this {
        const event = EventEmitter.createEvent(type, detail);

        this.dispatchEvent(event);

        return this;
    }

    /**
     * Emit an event with given detail
     * Calls all listeners that listen to the emitted event
     *
     * @param type name of the event
     * @param param1 the detail that should be applied to the event
     * @returns a Promise that resolves with this
     */
    emit<Ev extends EventNames<UserEvents>>(
        type: Ev,
        ...[detail]: CustomEventDetailParameter<UserEvents, Ev>
    ): this {
        // @ts-ignore <I don't know why this doesn't work>
        this._emit(type, ...[detail]!);

        return this;
    }

    /**
     * Emits a reserved event.
     *
     * This method is `protected`, so that only a class extending
     * `StrictEventEmitter` can emit its own reserved events.
     *
     * @param type Reserved event name
     * @param detail Arguments to emit along with the event
     */
    protected emitReserved<Ev extends EventNames<ReservedEvents>>(
        type: Ev,
        ...[detail]: CustomEventDetailParameter<ReservedEvents, Ev>
    ): this {
        // @ts-ignore <I don't know why this doesn't work>
        return this._emit(type, ...[detail]!);
    }

    /**
     * Emits an event.
     *
     * This method is `protected`, so that only a class extending
     * `StrictEventEmitter` can get around the strict typing. This is useful for
     * calling `emit.apply`, which can be called as `emitUntyped.apply`.
     *
     * @param type Event name
     * @param args Arguments to emit along with the event
     */
    protected emitUntyped(
        type: EvName,
        ...[detail]: CustomEventDetailParameter<CustomEventMap, EvName>
    ): this {
        const event = EventEmitter.createEvent(type, detail);

        this.dispatchEvent(event);

        return this;
    }

    /**
     * wait for an event to be dispatched
     * @param type the typed name of the event
     */
    pull<Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>>(
        type: Ev,
    ): Promise<UserEvents[Ev]>;

    /**
     * wait for an event to be dispatched and reject after a specific amount of milliseconds
     * @param type the typed name of the event
     * @param timeout optional timeout
     */
    pull<Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>>(
        type: Ev,
        timeout: number,
    ): Promise<UserEvents[Ev]>;

    pull<Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>>(
        type: Ev,
        timeout?: number,
    ): Promise<UserEvents[Ev]> {
        return new Promise((resolve, reject) => {
            let timeoutId: number;

            const callback = ((
                detail: ReservedOrUserListenerOnParams<
                    ReservedEvents,
                    UserEvents,
                    Ev
                >,
            ) => {
                timeoutId && clearTimeout(timeoutId);

                resolve(detail);
            }) as ReservedOrUserListenerOn<ReservedEvents, UserEvents, Ev>;

            this.once(type, callback);

            if (timeout) {
                timeoutId = setTimeout(() => {
                    clearTimeout(timeoutId!);

                    reject(new Error("Timed out!"));
                }, timeout);
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
    subscribe<Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>>(
        type: Ev,
        callback: ReservedOrUserListenerOn<ReservedEvents, UserEvents, Ev>,
        options?: Parameters<EventTarget["addEventListener"]>[2],
    ): Fn<never, void> {
        this.on(type, callback, options);

        return () => {
            this.off(type, callback);
        };
    }

    /**
     * Get all EventListeners
     */
    getListeners<
        Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>,
    >(): Map<
        EvName,
        Set<
            ReservedOrUserListenerOnOrAddEventListener<
                ReservedEvents,
                UserEvents,
                Ev
            >
        >
    >;

    /**
     * Get all EventListeners for a specific Event
     * @param type the event name
     */
    getListeners<
        Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>,
    >(
        type: string,
    ): Set<
        ReservedOrUserListenerOnOrAddEventListener<
            ReservedEvents,
            UserEvents,
            Ev
        >
    >;

    getListeners<
        Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>,
    >(
        type?: Ev,
    ):
        | Set<
            ReservedOrUserListenerOnOrAddEventListener<
                ReservedEvents,
                UserEvents,
                Ev
            >
        >
        | Map<
            Ev,
            Set<
                ReservedOrUserListenerOnOrAddEventListener<
                    ReservedEvents,
                    UserEvents,
                    Ev
                >
            >
        > {
        const getListenersOfType = (type: Ev) => {
            const listeners = new Set<
                ReservedOrUserListenerOnOrAddEventListener<
                    ReservedEvents,
                    UserEvents,
                    Ev
                >
            >();

            const listenersMap = this.__listeners__.get(type);

            if (listenersMap) {
                for (const listener of listenersMap.keys()) {
                    listeners.add(listener);
                }
            }

            return listeners;
        };

        if (!type) {
            const listeners = new Map<
                Ev,
                Set<
                    ReservedOrUserListenerOnOrAddEventListener<
                        ReservedEvents,
                        UserEvents,
                        Ev
                    >
                >
            >();

            const entries = this.__listeners__.keys();

            for (const type of entries) {
                listeners.set(type as Ev, getListenersOfType(type as Ev));
            }

            return listeners;
        }

        return getListenersOfType(type);
    }

    listeners = this.getListeners;
}

export default EventEmitter;
