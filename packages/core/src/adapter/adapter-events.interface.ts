import type { NestWhatsMessage } from "../structures/index.js";
import type { ConnectionUpdate } from "./connection-update.interface.js";

/**
 * The contract every adapter must emit. Deliberately small: two events that
 * every WhatsApp platform can express, in NestWhats' own vocabulary rather than
 * any library's.
 *
 * The core derives the ergonomic events (`ready`, `qr`, `disconnected`, …) from
 * `connectionUpdate`, so an adapter never has to track which of them it already
 * emitted. Anything a platform offers beyond this is its own business and is
 * declared through module augmentation of `NestWhatsBaseEvents`.
 */
export interface NestWhatsAdapterEvents {
	connectionUpdate: [update: ConnectionUpdate];
	/** Any message the platform surfaces, sent or received; filter with `fromMe`. */
	messageUpsert: [message: NestWhatsMessage];
}

/** One of the two events an adapter emits. */
export type NestWhatsAdapterEvent = keyof NestWhatsAdapterEvents;

/** The two events, for checking an adapter announces both. */
export const NESTWHATS_ADAPTER_EVENTS: readonly NestWhatsAdapterEvent[] = [
	"connectionUpdate",
	"messageUpsert",
];
