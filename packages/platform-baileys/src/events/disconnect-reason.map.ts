import { DisconnectReason as BaileysDisconnectReason } from "@whiskeysockets/baileys";
import { DisconnectKind, type DisconnectReason } from "nestwhats";

/**
 * Baileys reports why a socket closed as an HTTP-like status code on a Boom
 * error. Map it to the portable kinds so handlers can tell "authenticate
 * again" from "the network blinked".
 *
 * `connectionLost` and `timedOut` share the code 408 upstream, so they are one
 * entry. `connectionClosed` (428), `multideviceMismatch` (411) and
 * `unavailableService` (503) have no portable meaning and stay `Unknown`.
 */
const CODE_TO_KIND: ReadonlyMap<number, DisconnectKind> = new Map([
	[BaileysDisconnectReason.loggedOut, DisconnectKind.LoggedOut],
	[BaileysDisconnectReason.restartRequired, DisconnectKind.RestartRequired],
	[BaileysDisconnectReason.forbidden, DisconnectKind.Forbidden],
	[BaileysDisconnectReason.connectionLost, DisconnectKind.ConnectionLost],
	[BaileysDisconnectReason.connectionReplaced, DisconnectKind.Conflict],
	[BaileysDisconnectReason.badSession, DisconnectKind.AuthFailure],
]);

/** The status code a Boom carries; typed by shape so the package needs no `@hapi/boom`. */
function statusCodeOf(error: unknown): number | undefined {
	const code = (error as { output?: { statusCode?: unknown } } | undefined)
		?.output?.statusCode;
	return typeof code === "number" ? code : undefined;
}

/**
 * Turns the error Baileys attaches to a `connection: 'close'` update into the
 * portable {@link DisconnectReason}.
 *
 * The numeric code is kept in `code`, and the platform's wording — the
 * Boom's message, or the `DisconnectReason` name when there is no message —
 * in `message`, for logs. A code this map does not know maps to `Unknown`
 * rather than being guessed at.
 */
export function toDisconnectReason(error: unknown): DisconnectReason {
	const code = statusCodeOf(error);
	const name = code !== undefined ? BaileysDisconnectReason[code] : undefined;
	return {
		kind:
			(code !== undefined ? CODE_TO_KIND.get(code) : undefined) ??
			DisconnectKind.Unknown,
		code,
		message:
			error instanceof Error && error.message
				? error.message
				: (name ?? (error === undefined ? undefined : String(error))),
	};
}
