/**
 * How far a sent message got, normalised across platforms.
 *
 * Every platform reports this, and each spells it differently: whatsapp-web.js
 * uses numeric acks (`-1` to `4`), Baileys the `WebMessageInfo.Status` enum,
 * and the official Cloud API the strings in its `statuses` webhook — where it
 * is the *only* way to learn a message failed, since the send call answers with
 * an id and nothing else.
 *
 * The values are ordered by progress, but do not compare them: a platform may
 * skip one, and `Failed` is not a stage.
 */
export enum MessageStatus {
	/** Accepted locally, not yet acknowledged by the server. */
	Pending = "pending",
	/** The server has it. */
	Sent = "sent",
	/** It reached the recipient's device. */
	Delivered = "delivered",
	/** The recipient opened the chat. */
	Read = "read",
	/** A voice note or video note was played. */
	Played = "played",
	/** It will not be delivered; `error` says why, where the platform says. */
	Failed = "failed",
}

/** One step in the life of a message this client sent. */
export interface NestWhatsMessageStatusUpdate {
	/** Platform id of the message this is about. */
	messageId: string;
	/** Chat it was sent to. */
	chatId: string;
	status: MessageStatus;
	/**
	 * In a group, the participant this status is about — one message collects a
	 * status per recipient. Absent in a direct chat, and on platforms that
	 * report only the aggregate.
	 */
	participantId?: string;
	/** Epoch milliseconds, when the platform stamps it. */
	timestamp?: number;
	/** Why it failed; only meaningful for `Failed`. */
	error?: {
		/** Platform-specific code, when it exposes one. */
		code?: string | number;
		message?: string;
	};
}
