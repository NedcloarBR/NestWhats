import type { NestWhatsClient } from "../client/client.js";
import type { NestWhatsEvents } from "../listeners/listener.interface.js";
import type { NestWhatsMessage } from "../structures/index.js";

/** What a command handler receives: the client and the message. */
export type CommandContext = [NestWhatsClient, NestWhatsMessage];

/**
 * The `@Context()` tuple for an event: the client, then that event's arguments.
 *
 * ```typescript
 * @On('disconnected')
 * onDrop(@Context() [client, reason]: ContextOf<'disconnected'>) {}
 * ```
 */
export type ContextOf<K extends keyof E, E = NestWhatsEvents> = [
	NestWhatsClient,
	...Extract<E[K], unknown[]>,
];
