export type EvName = string;

export type Fn<
    Params extends readonly unknown[] = readonly unknown[],
    Result = unknown,
> = (...params: Params) => Result;

/**
 * Returns a union type containing all the keys of an event map.
 */
export type EventNames<Map extends CustomEventMap> = keyof Map & EvName;

/**
 * Interface for classes that aren't `EventEmitter`s, but still expose a
 * strictly typed `emit` method.
 */
export interface TypedEventBroadcaster<EmitEvents extends CustomEventMap> {
    emit<Ev extends EventNames<EmitEvents>>(
        ev: Ev,
        ...args: CustomEventDetailParameter<EmitEvents, Ev>
    ): this;
}

export type TypedCustomEvent<
    Type extends EvName,
    Detail = unknown,
> = CustomEvent<Detail> & { type: Type };

export type EventTargetCompatible = Extract<
    Parameters<EventTarget["addEventListener"]>[1],
    Fn
>;
// for untyped emitter
// deno-lint-ignore no-explicit-any
export type CustomEventMap = Record<EvName, any>;

export type CustomEventListenerMap<
    ReservedEvents extends CustomEventMap,
    UserEvents extends CustomEventMap,
    Ev extends ReservedOrUserEventNames<
        ReservedEvents,
        UserEvents
    > = ReservedOrUserEventNames<ReservedEvents, UserEvents>,
> = Map<
    ReservedOrUserListenerOnOrAddEventListener<ReservedEvents, UserEvents, Ev>,
    ReservedOrUserListenerAddEventListener<ReservedEvents, UserEvents, Ev>
>;

export type CustomEventDetailParameter<
    T extends CustomEventMap,
    K extends keyof T,
> = unknown extends T[K] ? [detail?: unknown]
    : undefined extends T[K] ? [detail?: T[K]]
    : T[K] extends never ? []
    : [detail: T[K]];

export type CustomEventCallbackAddEventListener<
    Ev extends EvName = EvName,
    Detail = unknown,
> = Fn<[event: TypedCustomEvent<Ev, Detail>], void>;

export type CustomEventCallbackOn<
    Ev extends EvName = EvName,
    Detail = unknown,
> = Fn<[event: TypedCustomEvent<Ev, Detail>["detail"]], void>;

/**
 * Returns an untyped listener type if `T` is `never`; otherwise, returns `T`.
 *
 * This is a hack to mitigate https://github.com/socketio/socket.io/issues/3833.
 * Needed because of https://github.com/microsoft/TypeScript/issues/41778
 */
export type FallbackToUntypedListener<T> = [T] extends [never]
    // deno-lint-ignore no-explicit-any
    ? (...args: any[]) => void | Promise<void>
    : T;

/**
 * The event names that are either in ReservedEvents or in UserEvents
 */
export type ReservedOrUserEventNames<
    ReservedEventsMap extends CustomEventMap,
    UserEvents extends CustomEventMap,
> = EventNames<ReservedEventsMap> | EventNames<UserEvents>;

export type ReservedOrUserListenerParamsAddEventListener<
    ReservedEvents extends CustomEventMap,
    UserEvents extends CustomEventMap,
    Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>,
> = Parameters<
    ReservedOrUserListenerAddEventListener<ReservedEvents, UserEvents, Ev>
>[0];

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

export type ReservedOrUserListenerOnParams<
    ReservedEvents extends CustomEventMap,
    UserEvents extends CustomEventMap,
    Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>,
> = Parameters<ReservedOrUserListenerOn<ReservedEvents, UserEvents, Ev>>[0];

export type ReservedOrUserListenerAddEventListenerParams<
    ReservedEvents extends CustomEventMap,
    UserEvents extends CustomEventMap,
    Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>,
> = Parameters<
    ReservedOrUserListenerAddEventListener<ReservedEvents, UserEvents, Ev>
>[0];
