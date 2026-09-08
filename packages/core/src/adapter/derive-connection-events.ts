import { ClientStatus } from "./client-status.enum.js";
import type { ConnectionUpdate } from "./connection-update.interface.js";

/** An event name with the arguments to emit it with. */
export type DerivedEvent = [event: string, args: unknown[]];

/** Ergonomic events the core derives; adapters never emit these directly. */
export const DERIVED_CONNECTION_EVENTS = [
	"qr",
	"pairingCode",
	"authenticated",
	"ready",
	"disconnected",
] as const;

const STATUS_EVENT: Partial<Record<ClientStatus, string>> = {
	[ClientStatus.Authenticated]: "authenticated",
	[ClientStatus.Ready]: "ready",
	[ClientStatus.Disconnected]: "disconnected",
};

/**
 * Expands a connection update into the events handlers listen to.
 *
 * Status events fire only on a real transition: platforms repeat their state
 * (Baileys reports `connection: "open"` again on every reconnect), and a second
 * `ready` would defeat `@Once`. Credential events are not transitions — a fresh
 * QR is a new value each time — so they fire whenever one is present.
 */
export function deriveConnectionEvents(
	update: ConnectionUpdate,
	previousStatus: ClientStatus | undefined,
): DerivedEvent[] {
	const events: DerivedEvent[] = [];

	if (update.qr) events.push(["qr", [update.qr]]);
	if (update.pairingCode) events.push(["pairingCode", [update.pairingCode]]);

	if (update.status !== previousStatus) {
		const event = STATUS_EVENT[update.status];
		if (event) {
			events.push([event, event === "disconnected" ? [update.reason] : []]);
		}
	}

	return events;
}
