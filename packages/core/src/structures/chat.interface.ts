import type { NestWhatsMessageContent } from "./media.js";
import type { NestWhatsMessage } from "./message.interface.js";

/** A member of a group chat. */
export interface NestWhatsParticipant {
	/** Canonical id of the member. */
	id: string;
	/** Admin or owner of the group — the platforms that distinguish them collapse both here. */
	isAdmin: boolean;
}

/**
 * Portable chat shape. `TRaw` is the platform's own chat object —
 * reach for it whenever you need something this contract does not cover.
 */
export interface NestWhatsChat<TRaw = unknown> {
	/** Canonical id of the conversation. */
	id: string;
	/** Group subject, or the contact's name in a DM. Absent when unknown. */
	name?: string;
	/**
	 * The group's description, when it has one and the platform exposes it.
	 * Always absent on a direct chat.
	 */
	description?: string;
	isGroup: boolean;
	/** Unread messages, where the platform tracks it. */
	unreadCount?: number;
	/** Epoch milliseconds of the latest message. */
	lastMessageAt?: number;
	archived?: boolean;
	pinned?: boolean;
	/** Notifications silenced for this chat. */
	muted?: boolean;
	/**
	 * Sends into this chat.
	 *
	 * Media only reaches a platform that supports it — check the client's
	 * `sendMedia` capability first if the code has to run on several.
	 */
	sendMessage(content: NestWhatsMessageContent): Promise<NestWhatsMessage>;
	/** Group-only capability; undefined when the adapter or chat does not support it. */
	getParticipants?(): Promise<NestWhatsParticipant[]>;

	/**
	 * Group management, answered by the member rather than by a capability
	 * flag: `if (chat.addParticipants)` is the check, and it is also false on a
	 * platform that has groups but not this operation.
	 *
	 * All of these are absent on a direct chat, and on a platform without
	 * groups at all — the official Cloud API cannot address a group, so an
	 * adapter for it leaves every one of them undefined.
	 *
	 * Being an admin is a separate question the platform answers at call time:
	 * these exist because the *platform* can do it, not because this account
	 * may.
	 */
	addParticipants?(participantIds: string[]): Promise<void>;
	removeParticipants?(participantIds: string[]): Promise<void>;
	/** Gives participants admin rights. */
	promoteParticipants?(participantIds: string[]): Promise<void>;
	/** Takes admin rights away. */
	demoteParticipants?(participantIds: string[]): Promise<void>;
	/** Renames the group. */
	setSubject?(subject: string): Promise<void>;
	setDescription?(description: string): Promise<void>;
	/**
	 * The invite code — the part after `chat.whatsapp.com/`, not the full URL.
	 */
	getInviteCode?(): Promise<string>;
	/** Invalidates the current invite code and returns the new one. */
	revokeInvite?(): Promise<string>;
	/** Leaves the group. The chat stays in the list; it just cannot post. */
	leave?(): Promise<void>;

	/** The platform's own chat object, untouched. */
	readonly raw: TRaw;
}
