/**
 * Why a connection dropped, normalised across platforms so a handler can act
 * without knowing which one is underneath — reconnecting is pointless after a
 * logout, and prompting for a new QR is wrong after a flaky network.
 */
export enum DisconnectKind {
	/** Credentials revoked: the client must authenticate again. */
	LoggedOut = "logged_out",
	/** The platform rejected the credentials. */
	AuthFailure = "auth_failure",
	/** Expected restart; the platform reconnects on its own. */
	RestartRequired = "restart_required",
	/** Platform is refusing this account (blocked, ineligible number). */
	Forbidden = "forbidden",
	/** Transport dropped; usually transient. */
	ConnectionLost = "connection_lost",
	/** Another session took over. */
	Conflict = "conflict",
	Unknown = "unknown",
}

/**
 * Why a client dropped: the portable `kind` to act on, plus the platform's own
 * code and wording for logs.
 */
export interface DisconnectReason {
	kind: DisconnectKind;
	/** Platform-specific code, when it exposes one. */
	code?: string | number;
	/** Platform wording, for logs. */
	message?: string;
}

/** True when reconnecting cannot help — the user has to authenticate again. */
export function isTerminalDisconnect(reason?: DisconnectReason): boolean {
	return (
		reason?.kind === DisconnectKind.LoggedOut ||
		reason?.kind === DisconnectKind.AuthFailure
	);
}
