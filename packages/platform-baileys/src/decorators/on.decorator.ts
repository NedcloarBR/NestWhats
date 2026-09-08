import { Listener } from "nestwhats";
import type { BaileysEvents } from "../events/index.js";

/**
 * Subscribes a handler to a Baileys event, with the event names and argument
 * types of this platform.
 *
 * `@On` from the core does the same thing and, once this package is imported,
 * knows these events too; the difference is that this one only accepts them,
 * so a typo in a platform event fails here instead of binding a listener that
 * never fires.
 *
 * @param event - a Baileys event, in NestWhats' camelCase spelling
 * (`messages.upsert` is `messagesUpsert`).
 * @param options - `client` limits the handler to one or more named clients.
 */
export const BaileysOn = <K extends keyof BaileysEvents>(
	event: K,
	options?: { client?: string | string[] },
) => Listener({ type: "on", event: event as string, client: options?.client });

/**
 * Like {@link BaileysOn}, but the handler runs for the first occurrence only.
 */
export const BaileysOnce = <K extends keyof BaileysEvents>(
	event: K,
	options?: { client?: string | string[] },
) =>
	Listener({ type: "once", event: event as string, client: options?.client });
