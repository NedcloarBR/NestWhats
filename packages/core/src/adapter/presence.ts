/**
 * Presence, in both directions: what this client announces, and what it
 * observes about someone else.
 *
 * `Typing`, `Recording` and `Paused` are the ones worth sending. `Available`
 * and `Unavailable` are mostly what you receive — a platform that reports
 * whether a contact is online uses them — though a platform that lets you go
 * invisible accepts them too.
 */
export enum PresenceState {
	Typing = "typing",
	Recording = "recording",
	Paused = "paused",
	/** Online. */
	Available = "available",
	/** Offline; `lastSeenAt` says when they were last around, if it is visible. */
	Unavailable = "unavailable",
}

/** What a platform reports about someone else's presence. */
export interface NestWhatsPresenceUpdate {
	/** Canonical id of the contact this is about. */
	contactId: string;
	state: PresenceState;
	/**
	 * Epoch milliseconds of the contact's last activity — "last seen at".
	 *
	 * Absent far more often than not: WhatsApp's privacy settings hide it by
	 * default, and most platforms never report it at all. Treat its absence as
	 * "not visible", never as "never seen".
	 */
	lastSeenAt?: number;
	/** Where this presence was observed, when the platform scopes it to a chat. */
	chatId?: string;
}

/** Who gets to see a status post. */
export interface PostStatusOptions {
	/**
	 * Canonical ids allowed to see it.
	 *
	 * Platforms differ on what omitting this means — usually "whatever the
	 * account's status privacy says" — so pass it explicitly when it matters.
	 */
	audience?: string[];
}
