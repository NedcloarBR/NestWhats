import { DisconnectKind, type DisconnectReason } from "nestwhats";
import { WAState } from "../runtime.js";

/**
 * whatsapp-web.js reports a `WAState` (or the literal `"NAVIGATION"` when the
 * page goes away) on disconnect. Map it to the portable kinds so handlers can
 * tell "authenticate again" from "the network blinked".
 */
const STATE_TO_KIND: ReadonlyMap<string, DisconnectKind> = new Map<
	string,
	DisconnectKind
>([
	[WAState.UNPAIRED, DisconnectKind.LoggedOut],
	[WAState.UNPAIRED_IDLE, DisconnectKind.LoggedOut],
	[WAState.CONFLICT, DisconnectKind.Conflict],
	[WAState.TOS_BLOCK, DisconnectKind.Forbidden],
	[WAState.SMB_TOS_BLOCK, DisconnectKind.Forbidden],
	[WAState.PROXYBLOCK, DisconnectKind.Forbidden],
	[WAState.TIMEOUT, DisconnectKind.ConnectionLost],
	["NAVIGATION", DisconnectKind.ConnectionLost],
	[WAState.DEPRECATED_VERSION, DisconnectKind.Unknown],
	[WAState.UNLAUNCHED, DisconnectKind.Unknown],
]);

/**
 * Turns the `WAState` whatsapp-web.js reports on disconnect into the portable
 * {@link DisconnectReason}, so a handler can decide what to do without knowing
 * this library's vocabulary.
 *
 * The platform's own wording is kept in `code` and `message` for logs. An
 * unrecognised state maps to `Unknown` rather than being guessed at.
 */
export function toDisconnectReason(state: unknown): DisconnectReason {
	const code = typeof state === "string" ? state : undefined;
	return {
		kind:
			(code ? STATE_TO_KIND.get(code) : undefined) ?? DisconnectKind.Unknown,
		code,
		message: code ?? String(state),
	};
}
