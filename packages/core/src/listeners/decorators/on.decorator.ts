import { NestWhatsEvents } from "../listener.interface.js";
import { Listener } from "./listener.decorator.js";

/**
 * Runs the handler every time the event fires.
 *
 * ```typescript
 * @On('ready')
 * onReady(@Context() [client]: ContextOf<'ready'>) {}
 * ```
 *
 * @param event - a NestWhats event, or one a platform package adds.
 * @param options - `client` limits the handler to one or more named clients.
 */
export const On = <K extends keyof E, E = NestWhatsEvents>(
	event: K,
	options?: { client?: string | string[] },
) => Listener({ type: "on", event, client: options?.client });
