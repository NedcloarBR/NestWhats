import { ClientStatus } from "./client-status.enum.js";
import type { ConnectionUpdate } from "./connection-update.interface.js";
import {
	type DerivedEvent,
	deriveConnectionEvents,
} from "./derive-connection-events.js";
import {
	type DisconnectReason,
	isTerminalDisconnect,
} from "./disconnect-reason.js";

/** How the event source treats a drop. */
export interface ConnectionEventSourceOptions {
	/**
	 * How long to wait before announcing a disconnect, in milliseconds.
	 *
	 * Platforms that reconnect on their own (Baileys especially) drop and
	 * recover within seconds, and announcing every flap gives handlers a
	 * `disconnected`/`ready` pair for something that never really went away.
	 * Waiting means a reconnect within the window cancels the announcement.
	 *
	 * `0` (the default) announces immediately. A terminal reason — a logout or
	 * an auth failure — always announces immediately, since no reconnect is
	 * coming.
	 */
	disconnectDebounceMs?: number;
}

/**
 * Turns the adapter's raw `connectionUpdate` stream into the events handlers
 * subscribe to, holding the state that `deriveConnectionEvents` cannot.
 */
export class ConnectionEventSource {
	private lastStatus?: ClientStatus;
	private pendingDisconnect?: DisconnectReason;
	private disconnectTimer?: NodeJS.Timeout;

	public constructor(
		private readonly emit: (event: string, args: unknown[]) => void,
		private readonly options: ConnectionEventSourceOptions = {},
	) {}

	public apply(update: ConnectionUpdate): void {
		const previousStatus = this.lastStatus;
		this.lastStatus = update.status;

		// Recovering while an announcement was still pending means the drop was a
		// flap. Swallow the recovery events too: from a handler's point of view
		// nothing happened, and a `ready` with no matching `disconnected` would
		// re-run whatever it does on connect.
		const wasFlap =
			update.status !== ClientStatus.Disconnected &&
			this.clearPendingDisconnect();

		for (const [event, args] of deriveConnectionEvents(
			update,
			previousStatus,
		)) {
			if (event === "disconnected") {
				this.announceDisconnect(update.reason, args);
				continue;
			}
			if (wasFlap) continue;
			this.emit(event, args);
		}
	}

	private announceDisconnect(
		reason: DisconnectReason | undefined,
		args: unknown[],
	): void {
		const debounce = this.options.disconnectDebounceMs ?? 0;
		if (debounce <= 0 || isTerminalDisconnect(reason)) {
			this.emit("disconnected", args);
			return;
		}

		this.pendingDisconnect = reason;
		if (this.disconnectTimer) return;

		this.disconnectTimer = setTimeout(() => {
			this.disconnectTimer = undefined;
			const pending = this.pendingDisconnect;
			this.pendingDisconnect = undefined;
			// Still down? Then it was not a flap.
			if (this.lastStatus === ClientStatus.Disconnected) {
				this.emit("disconnected", [pending]);
			}
		}, debounce);
		this.disconnectTimer.unref?.();
	}

	/** Cancels a scheduled announcement. Returns true if there was one. */
	private clearPendingDisconnect(): boolean {
		const wasPending = this.disconnectTimer !== undefined;
		if (this.disconnectTimer) {
			clearTimeout(this.disconnectTimer);
			this.disconnectTimer = undefined;
		}
		this.pendingDisconnect = undefined;
		return wasPending;
	}

	/** Drops any scheduled announcement; call when the client goes away. */
	public dispose(): void {
		this.clearPendingDisconnect();
	}
}

export type { DerivedEvent };
