import type { NestWhatsChat } from "./chat.interface.js";
import type { NestWhatsContact } from "./contact.interface.js";
import type { NestWhatsMedia, NestWhatsMessageContent } from "./media.js";
import type { NestWhatsMessageType } from "./message-type.enum.js";

/**
 * Portable message shape.
 *
 * The required members are the ones every platform can answer: what the message
 * is, who sent it, where, and how to reply. The optional ones are genuinely not
 * universal — the official Cloud API cannot delete a sent message or fetch the
 * chat a message belongs to — so check the member before calling it.
 *
 * `TRaw` is the platform's own message object, exposed untouched through
 * `raw`. Anything this contract does not cover (and anything the platform
 * adds later) is reachable there with full typings and no cast.
 */
export interface NestWhatsMessage<TRaw = unknown> {
	/** Platform id for this message. Unique per platform, not across them. */
	id: string;
	/** Chat where the message was sent (group or DM). */
	chatId: string;
	/** Who sent it: the participant in groups, the contact in DMs, own id when fromMe. */
	senderId: string;
	/** Sent by this client, rather than received. */
	fromMe: boolean;
	/** Text content, or the caption of a media message. Empty when there is neither. */
	body: string;
	type: NestWhatsMessageType;
	/** Epoch milliseconds. */
	timestamp: number;
	/** There is an attachment; fetch it with `downloadMedia`. */
	hasMedia: boolean;
	isForwarded: boolean;
	/** Status/story broadcast message. */
	isStatus: boolean;
	/** This message replies to another; fetch it with `getQuotedMessage`. */
	hasQuotedMessage: boolean;
	/** Canonical ids mentioned in the body, in the order they appear. */
	mentionedIds: string[];
	/**
	 * Answers this message, quoting it.
	 *
	 * Media only reaches a platform that supports it — check the client's
	 * `sendMedia` capability first if the code has to run on several.
	 */
	reply(content: NestWhatsMessageContent): Promise<NestWhatsMessage<TRaw>>;
	/**
	 * The attachment, when there is one.
	 *
	 * `undefined` when the message carries no media, or when the platform can no
	 * longer fetch it — WhatsApp expires media on its servers, so an old message
	 * answers `undefined` rather than throwing.
	 */
	downloadMedia?(): Promise<NestWhatsMedia | undefined>;
	/** Reacts with a single emoji; an empty string removes the reaction. */
	react?(emoji: string): Promise<void>;
	/**
	 * Replaces the text of a message this client sent.
	 *
	 * `undefined` when the platform refused rather than failed: the message is
	 * not this account's, or WhatsApp's edit window has closed — it allows
	 * roughly 15 minutes. Both are ordinary answers, not errors, so check the
	 * result instead of catching.
	 *
	 * Media cannot be swapped; only the text and its caption.
	 */
	edit?(content: string): Promise<NestWhatsMessage<TRaw> | undefined>;
	/** Sends this message on to another chat, marked as forwarded. */
	forward?(chatId: string): Promise<void>;
	/**
	 * Deletes the message.
	 *
	 * @param forEveryone - delete for every participant instead of only for
	 * this account. Only possible for messages this client sent, and only
	 * within the platform's time limit.
	 */
	delete?(forEveryone?: boolean): Promise<void>;
	/** The chat this message belongs to. */
	getChat?(): Promise<NestWhatsChat>;
	/** The contact who sent it. */
	getContact?(): Promise<NestWhatsContact>;
	/** The message this one replies to, or `undefined` when there is none. */
	getQuotedMessage?(): Promise<NestWhatsMessage<TRaw> | undefined>;
	/** The platform's own message object, untouched. */
	readonly raw: TRaw;
}
