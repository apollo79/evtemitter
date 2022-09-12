import { UntypedEventEmitter } from "./UntypedEventEmitter.ts";
import type {
    CustomEventCallbackAddEventListener,
    CustomEventCallbackOn,
    CustomEventDetailParameter,
    CustomEventListenerMap,
    CustomEventMap,
    EventNames,
    EvName,
    Fn,
    TypedCustomEvent,
    TypedEventBroadcaster,
} from "./types.ts";

/**
 * The event names that are either in ReservedEvents or in UserEvents
 */
export type ReservedOrUserEventNames<
    ReservedEventsMap extends CustomEventMap,
    UserEvents extends CustomEventMap,
> = EventNames<ReservedEventsMap> | EventNames<UserEvents>;

/**
 * Type of a listener of a user event or a reserved event. If `Ev` is in
 * `ReservedEvents`, the reserved event listener is returned.
 */
export type ReservedOrUserListenerOn<
    ReservedEvents extends CustomEventMap,
    UserEvents extends CustomEventMap,
    Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>,
> = FallbackToUntypedListener<
    Ev extends EventNames<ReservedEvents>
        ? CustomEventCallbackOn<Ev, ReservedEvents[Ev]>
        : Ev extends EventNames<UserEvents>
            ? CustomEventCallbackOn<Ev, UserEvents[Ev]>
        : never
>;

export type ReservedOrUserListenerAddEventListener<
    ReservedEvents extends CustomEventMap,
    UserEvents extends CustomEventMap,
    Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>,
> = FallbackToUntypedListener<
    Ev extends EventNames<ReservedEvents>
        ? CustomEventCallbackAddEventListener<Ev, ReservedEvents[Ev]>
        : Ev extends EventNames<UserEvents>
            ? CustomEventCallbackAddEventListener<Ev, UserEvents[Ev]>
        : never
>;

export type ReservedOrUserListenerOnOrAddEventListener<
    ReservedEvents extends CustomEventMap,
    UserEvents extends CustomEventMap,
    Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>,
> = FallbackToUntypedListener<
    Ev extends EventNames<ReservedEvents> ? 
            | CustomEventCallbackAddEventListener<Ev, ReservedEvents[Ev]>
            | CustomEventCallbackOn<Ev, ReservedEvents[Ev]>
        : Ev extends EventNames<UserEvents> ? 
                | CustomEventCallbackAddEventListener<Ev, UserEvents[Ev]>
                | CustomEventCallbackOn<Ev, UserEvents[Ev]>
        : never
>;

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
export class ReservedEventEmitter<
    ListenEvents extends CustomEventMap = CustomEventMap,
    EmitEvents extends CustomEventMap = ListenEvents,
    ReservedEvents extends CustomEventMap = Record<never, never>,
> extends UntypedEventEmitter implements TypedEventBroadcaster<EmitEvents> {
    protected __listeners__: Map<string, CustomEventListenerMap> = new Map();

    protected detailPasser<
        K extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>,
    >(callback: CustomEventCallbackOn<K, ListenEvents[K]>) {
        const call = (event: TypedCustomEvent<K, ListenEvents[K]>): void => {
            callback(event.detail);
        };

        return call;
    }

    protected onceRemover<
        Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>,
    >(
        type: Ev,
        callback: ReservedOrUserListenerAddEventListener<
            ReservedEvents,
            ListenEvents,
            Ev
        >,
    ) {
        const cb = (event: TypedCustomEvent<Ev, ListenEvents[Ev]>): void => {
            callback(event);

            this.removeEventListener(type, callback);
        };

        return cb;
    }

    protected getOrCreateListeners<
        Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>,
    >(type: Ev): CustomEventListenerMap<Ev, ListenEvents[Ev]> {
        if (!this.__listeners__.has(type)) {
            this.__listeners__.set(type, new Map());
        }

        return this.__listeners__.get(type)!;
    }

    addEventListener<
        Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>,
    >(
        type: Ev,
        callback: ReservedOrUserListenerAddEventListener<
            ReservedEvents,
            ListenEvents,
            Ev
        >,
        options?: boolean | AddEventListenerOptions,
    ): this {
        return super.addEventListener(type, callback, options);
    }

    /**
     * Adds the `listener` function as an event listener for `ev`.
     *
     * @param ev Name of the event
     * @param listener Callback function
     */
    on<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(
        type: Ev,
        callback: ReservedOrUserListenerOn<ReservedEvents, ListenEvents, Ev>,
        options?: boolean | AddEventListenerOptions,
    ): this;

    on<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(
        types: Ev[],
        callback: ReservedOrUserListenerOn<ReservedEvents, ListenEvents, Ev>,
        options?: boolean | AddEventListenerOptions,
    ): this;

    on<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(
        types: Ev | Ev[],
        callback: ReservedOrUserListenerOn<ReservedEvents, ListenEvents, Ev>,
        options?: boolean | AddEventListenerOptions,
    ): this {
        // @ts-ignore <>
        return super.on(types, callback, options);
    }

    /**
     * Adds a one-time `listener` function as an event listener for `ev`.
     *
     * @param ev Name of the event
     * @param listener Callback function
     */
    once<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(
        type: Ev,
        callback: ReservedOrUserListenerOn<ReservedEvents, ListenEvents, Ev>,
        options?: boolean | AddEventListenerOptions,
    ): this;

    once<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(
        types: Ev[],
        callback: ReservedOrUserListenerOn<ReservedEvents, ListenEvents, Ev>,
        options?: boolean | AddEventListenerOptions,
    ): this;

    once<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(
        type: Ev,
        listener: ReservedOrUserListenerOn<ReservedEvents, ListenEvents, Ev>,
    ): this {
        return super.once(type, listener);
    }

    removeEventListener<
        Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>,
    >(
        type: Ev,
        callback: ReservedOrUserListenerOnOrAddEventListener<
            ReservedEvents,
            ListenEvents,
            Ev
        >,
        options?: boolean | EventListenerOptions | undefined,
    ): this {
        return super.removeEventListener(type, callback, options);
    }

    off(): this;
    off<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(
        type: Ev,
    ): this;
    off<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(
        types: Ev[],
    ): this;
    off<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(
        type: Ev,
        callback: ReservedOrUserListenerOnOrAddEventListener<
            ReservedEvents,
            ListenEvents,
            Ev
        >,
    ): this;
    off<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(
        types: Ev[],
        callback: ReservedOrUserListenerOnOrAddEventListener<
            ReservedEvents,
            ListenEvents,
            Ev
        >,
    ): this;
    off<Ev extends EventNames<ListenEvents>>(
        types?: Ev | Ev[],
        callback?: ReservedOrUserListenerOnOrAddEventListener<
            ReservedEvents,
            ListenEvents,
            Ev
        >,
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
    emit<Ev extends EventNames<EmitEvents>>(
        type: Ev,
        ...[args]: CustomEventDetailParameter<EmitEvents, Ev>
    ): this {
        return super.emit(type, ...[args]);
    }

    /**
     * Emits a reserved event.
     *
     * This method is `protected`, so that only a class extending
     * `StrictEventEmitter` can emit its own reserved events.
     *
     * @param ev Reserved event name
     * @param args Arguments to emit along with the event
     */
    protected emitReserved<Ev extends EventNames<ReservedEvents>>(
        type: Ev,
        ...args: CustomEventDetailParameter<ReservedEvents, Ev>
    ): this {
        return super.emit(type, ...args);
    }

    /**
     * Emits an event.
     *
     * This method is `protected`, so that only a class extending
     * `StrictEventEmitter` can get around the strict typing. This is useful for
     * calling `emit.apply`, which can be called as `emitUntyped.apply`.
     *
     * @param ev Event name
     * @param args Arguments to emit along with the event
     */
    protected emitUntyped(ev: string, ...args: any[]): this {
        return super.emit(ev, ...args);
    }

    pull<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(
        type: Ev,
    ): Promise<ListenEvents[Ev]>;

    pull<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(
        type: Ev,
        timeout: number,
    ): Promise<ListenEvents[Ev]>;

    pull<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(
        type: Ev,
        timeout?: number,
    ): Promise<ListenEvents[Ev]> {
        // @ts-ignore <there are matching overloads, but typescript doesn't seem to recognize that>
        return super.pull(type, timeout);
    }

    subscribe<
        Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>,
    >(
        type: Ev,
        callback: ReservedOrUserListenerOn<ReservedEvents, ListenEvents, Ev>,
        options?: Parameters<EventTarget["addEventListener"]>[2],
    ): Fn<never, void> {
        this.on(type, callback, options);

        return () => {
            this.off(type, callback);
        };
    }

    getListeners<
        Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>,
    >(): Map<
        EvName,
        Set<
            | CustomEventCallbackAddEventListener<
                Ev,
                ReservedOrUserListenerOn<ReservedEvents, EmitEvents, Ev>
            >
            | CustomEventCallbackOn
        >
    >;

    getListeners<
        Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>,
    >(
        type: string,
    ): Set<
        | CustomEventCallbackAddEventListener<
            Ev,
            ReservedOrUserListenerOn<ReservedEvents, EmitEvents, Ev>
        >
        | CustomEventCallbackOn
    >;

    getListeners<
        Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>,
    >(
        type?: Ev,
    ):
        | Set<
            | CustomEventCallbackAddEventListener<
                Ev,
                ReservedOrUserListenerOn<ReservedEvents, EmitEvents, Ev>
            >
            | CustomEventCallbackOn
        >
        | Map<
            EvName,
            Set<
                | CustomEventCallbackAddEventListener<
                    Ev,
                    ReservedOrUserListenerOn<ReservedEvents, EmitEvents, Ev>
                >
                | CustomEventCallbackOn
            >
        > {
        // @ts-expect-error <there are matching overloads, but typescript doesn't seem to recognize that>
        return super.getListeners(type);
    }
}
