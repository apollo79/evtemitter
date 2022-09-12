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

export type CustomEventMap = Record<EvName, unknown>;

export type CustomEventListenerMap<
    Type extends EvName = EvName,
    Detail = unknown,
> = Map<
    | CustomEventCallbackOn<Type, Detail>
    | CustomEventCallbackAddEventListener<Type, Detail>,
    CustomEventCallbackAddEventListener<Type, Detail>
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
    ? (...args: any[]) => void | Promise<void>
    : T;
