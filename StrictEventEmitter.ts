import {
    CustomEventCallbackOn,
    CustomEventDetailParameter,
    CustomEventMap,
    EventEmitter,
} from "./EventEmitter.ts";

export type CustomEmitEventsMap<
    Reserved extends CustomEventMap,
> =
    & CustomEventMap
    & {
        [key in keyof Reserved]: never;
    };

export type CustomListenEventsMap<
    Reserved extends CustomEventMap,
    EmitEvents extends CustomEmitEventsMap<Reserved>,
> = {
    [key in keyof Reserved | keyof EmitEvents]: unknown;
};

export class StrictEventEmitter<
    ReservedEvents extends CustomEventMap,
    EmitEvents extends CustomEmitEventsMap<ReservedEvents>,
    ListenEvents extends CustomListenEventsMap<ReservedEvents, EmitEvents> =
        & ReservedEvents
        & EmitEvents,
> extends EventEmitter<ReservedEvents & EmitEvents & ListenEvents> {
    // @ts-expect-error <different implementation>
    on<K extends keyof ListenEvents & string>(
        types: K | K[],
        callback: CustomEventCallbackOn<K, (ReservedEvents & EmitEvents)[K]>,
    ) {
        const addCallback = (type: K) => {
            this
                .getOrCreateListeners(type)
                .add(callback);
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
     * Emit an event with given detail
     * Calls all listeners that listen to the emitted event
     * @param type name of the event
     * @param param1 the detail that should be applied to the event
     * @returns a Promise that resolves with this
     */
    // @ts-expect-error <different typeargs>
    emit<K extends keyof EmitEvents & string>(
        type: K,
        ...[detail]: CustomEventDetailParameter<EmitEvents, K>
    ): this {
        const event = EventEmitter.createEvent(
            type,
            detail,
        );

        this.dispatchEvent(event);

        return this;
    }

    protected emitReserved<K extends keyof ReservedEvents & string>(
        type: K,
        ...[detail]: CustomEventDetailParameter<ReservedEvents, K>
    ): this {
        const event = EventEmitter.createEvent(
            type,
            detail,
        );

        this.dispatchEvent(event);

        return this;
    }
}

export default StrictEventEmitter;
