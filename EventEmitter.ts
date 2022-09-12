import {
    CallbackAddEventListener,
    CallbackOn,
    UntypedEventEmitter,
} from "./UntypedEventEmitter.ts";
import type {
    CustomEventCallbackAddEventListener,
    CustomEventCallbackOn,
    CustomEventDetailParameter,
    CustomEventListenerMap,
    CustomEventMap,
    EventNames,
    EvName,
    TypedCustomEvent,
    TypedEventBroadcaster,
} from "./types.ts";

/**
 * Returns an untyped listener type if `T` is `never`; otherwise, returns `T`.
 *
 * This is a hack to mitigate https://github.com/socketio/socket.io/issues/3833.
 * Needed because of https://github.com/microsoft/TypeScript/issues/41778
 */
type FallbackToUntypedListener<T> = [T] extends [never]
    ? (...args: any[]) => void | Promise<void>
    : T;
/**
 * Strictly typed version of an `EventEmitter`. A `TypedEventEmitter` takes type
 * parameters for mappings of event names to event data types, and strictly
 * types method calls to the `EventEmitter` according to these event maps.
 *
 * @typeParam ListenEvents - `EventsMap` of user-defined events that can be
 * listened to with `on` or `once`
 * @typeParam EmitEvents - `EventsMap` of user-defined events that can be
 * emitted with `emit`
 * @typeParam ReservedEvents - `EventsMap` of reserved events, that can be
 * emitted by socket.io with `emitReserved`, and can be listened to with
 * `listen`.
 */
export class EventEmitter<Events extends CustomEventMap>
    extends UntypedEventEmitter
    implements TypedEventBroadcaster<Events> {
    protected __listeners__: Map<string, CustomEventListenerMap> = new Map();

    static createEvent<Ev extends EvName, Detail>(
        type: Ev,
        detail?: Detail,
        init?: Omit<CustomEventInit, "detail">,
    ): TypedCustomEvent<Ev, Detail> {
        const evInit = { ...init, detail };

        return new CustomEvent(type, evInit) as TypedCustomEvent<Ev, Detail>;
    }

    protected detailPasser<K extends EventNames<Events>>(
        callback: CustomEventCallbackOn<K, Events[K]>,
    ) {
        const call = (event: TypedCustomEvent<K, Events[K]>): void => {
            callback(event.detail);
        };

        return call;
    }

    protected onceRemover<Ev extends EventNames<Events>>(
        type: Ev,
        callback: CustomEventCallbackAddEventListener<Ev, Events[Ev]>,
    ) {
        const cb = (event: TypedCustomEvent<Ev, Events[Ev]>): void => {
            callback(event);

            this.removeEventListener(type, callback);
        };

        return cb;
    }

    protected getOrCreateListeners<Ev extends EventNames<Events>>(
        type: Ev,
    ): CustomEventListenerMap<Ev, Events[Ev]> {
        if (!this.__listeners__.has(type)) {
            this.__listeners__.set(type, new Map());
        }

        return this.__listeners__.get(type)!;
    }

    addEventListener<Ev extends EventNames<Events>>(
        type: Ev,
        callback: FallbackToUntypedListener<
            CustomEventCallbackAddEventListener<Ev, Events[Ev]>
        >,
        options?: boolean | AddEventListenerOptions,
    ): this {
        // @ts-ignore <>
        return super.addEventListener(type, callback, options);
    }

    on<Ev extends EventNames<Events>>(
        type: Ev,
        callback: FallbackToUntypedListener<
            CustomEventCallbackOn<Ev, Events[Ev]>
        >,
        options?: AddEventListenerOptions,
    ): this;

    on<Ev extends EventNames<Events>>(
        types: Ev[],
        callback: FallbackToUntypedListener<
            CustomEventCallbackOn<Ev, Events[Ev]>
        >,
        options?: AddEventListenerOptions,
    ): this;

    /**
     * Adds the `listener` function as an event listener for `ev`.
     *
     * @param ev Name of the event
     * @param listener Callback function
     */
    on<Ev extends EventNames<Events>>(
        types: Ev | Ev[],
        listener: FallbackToUntypedListener<
            CustomEventCallbackOn<Ev, Events[Ev]>
        >,
    ): this {
        // @ts-expect-error <crazy, there are two overloads, but it is not ok for typescript>
        return super.on(types, listener);
    }

    once<Ev extends EventNames<Events>>(
        type: Ev,
        callback: FallbackToUntypedListener<
            CustomEventCallbackOn<Ev, Events[Ev]>
        >,
        options?: AddEventListenerOptions | undefined,
    ): this;

    once<Ev extends EventNames<Events>>(
        types: Ev[],
        callback: FallbackToUntypedListener<
            CustomEventCallbackOn<Ev, Events[Ev]>
        >,
        options?: AddEventListenerOptions | undefined,
    ): this;

    /**
     * Adds a one-time `listener` function as an event listener for `ev`.
     *
     * @param ev Name of the event
     * @param listener Callback function
     */
    once<Ev extends EventNames<Events>>(
        type: Ev,
        listener: FallbackToUntypedListener<
            CustomEventCallbackOn<Ev, Events[Ev]>
        >,
    ): this {
        return super.once(type, listener);
    }

    removeEventListener<Ev extends EventNames<Events>>(
        type: Ev,
        callback:
            | CustomEventCallbackAddEventListener<Ev, Events[Ev]>
            | CustomEventCallbackOn<Ev, Events[Ev]>,
        options?: boolean | EventListenerOptions | undefined,
    ): this {
        return super.removeEventListener(type, callback, options);
    }

    off<Ev extends EventNames<Events>>(): this;
    off<Ev extends EventNames<Events>>(type: Ev): this;
    off<Ev extends EventNames<Events>>(types: Ev[]): this;
    off<Ev extends EventNames<Events>>(
        type: Ev,
        callback:
            | CustomEventCallbackAddEventListener<Ev, Events[Ev]>
            | CustomEventCallbackOn<Ev, Events[Ev]>,
    ): this;
    off<Ev extends EventNames<Events>>(
        types: Ev[],
        callback:
            | CustomEventCallbackAddEventListener<Ev, Events[Ev]>
            | CustomEventCallbackOn<Ev, Events[Ev]>,
    ): this;
    off<Ev extends EventNames<Events>>(
        types?: Ev | Ev[],
        callback?:
            | CustomEventCallbackAddEventListener<Ev, Events[Ev]>
            | CustomEventCallbackOn<Ev, Events[Ev]>,
    ): this {
        // @ts-ignore <there are matching overloads, but typescript doesn't seem to recognize that>
        return super.off(types, callback);
    }

    /**
     * Emits an event.
     *
     * @param ev Name of the event
     * @param args Values to send to listeners of this event
     */
    emit<Ev extends EventNames<Events>>(
        type: Ev,
        ...[args]: CustomEventDetailParameter<Events, Ev>
    ): this {
        return super.emit(type, ...[args]);
    }

    /**
     * Emits an event.
     *
     * This method is `protected`, so that only a class extending
     * `EventEmitter` can get around the strict typing. This is useful for
     * calling `emit.apply`, which can be called as `emitUntyped.apply`.
     *
     * @param ev Event name
     * @param args Arguments to emit along with the event
     */
    protected emitUntyped(ev: string, ...args: any[]): this {
        return super.emit(ev, ...[args]);
    }

    getListeners<Ev extends EventNames<Events>>(): Map<
        EvName,
        Set<
            | CustomEventCallbackAddEventListener<
                Ev,
                CustomEventDetailParameter<Events, Ev>
            >
            | CustomEventCallbackOn<Ev, CustomEventDetailParameter<Events, Ev>>
        >
    >;

    getListeners<Ev extends EventNames<Events>>(
        type: string,
    ): Set<
        | CustomEventCallbackAddEventListener<
            Ev,
            CustomEventDetailParameter<Events, Ev>
        >
        | CustomEventCallbackOn<Ev, CustomEventDetailParameter<Events, Ev>>
    >;

    getListeners<Ev extends EventNames<Events>>(
        type?: Ev,
    ):
        | Set<
            | CustomEventCallbackAddEventListener<
                Ev,
                CustomEventDetailParameter<Events, Ev>
            >
            | CustomEventCallbackOn<Ev, CustomEventDetailParameter<Events, Ev>>
        >
        | Map<
            EvName,
            Set<
                | CustomEventCallbackAddEventListener<
                    Ev,
                    CustomEventDetailParameter<Events, Ev>
                >
                | CustomEventCallbackOn<
                    Ev,
                    CustomEventDetailParameter<Events, Ev>
                >
            >
        > {
        // @ts-expect-error <crazy, there are two overloads, but it is not ok for typescript>
        return super.getListeners(type);
    }
}

export default EventEmitter;
