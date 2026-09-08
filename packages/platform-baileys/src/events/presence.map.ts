import type { WAPresence } from "@whiskeysockets/baileys";
import { PresenceState } from "nestwhats";

/**
 * Baileys' presence words <-> the portable {@link PresenceState}. Both
 * directions are total: every state Baileys reports has a portable name, and
 * every portable state can be sent — `available` and `unavailable` included,
 * which is how a socket client goes visibly online or invisible.
 */
const NATIVE_TO_STATE: Readonly<Record<WAPresence, PresenceState>> = {
	composing: PresenceState.Typing,
	recording: PresenceState.Recording,
	paused: PresenceState.Paused,
	available: PresenceState.Available,
	unavailable: PresenceState.Unavailable,
};

const STATE_TO_NATIVE: Readonly<Record<PresenceState, WAPresence>> = {
	[PresenceState.Typing]: "composing",
	[PresenceState.Recording]: "recording",
	[PresenceState.Paused]: "paused",
	[PresenceState.Available]: "available",
	[PresenceState.Unavailable]: "unavailable",
};

/** `undefined` for a word this map does not know, rather than a guess. */
export function toPresenceState(
	presence: WAPresence | undefined,
): PresenceState | undefined {
	return presence ? NATIVE_TO_STATE[presence] : undefined;
}

export function toNativePresence(state: PresenceState): WAPresence {
	return STATE_TO_NATIVE[state];
}
