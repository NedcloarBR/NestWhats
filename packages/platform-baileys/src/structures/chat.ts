import {
	type Chat,
	type GroupMetadata,
	isJidGroup,
	type MinimalMessage,
} from "@whiskeysockets/baileys";
import type {
	NestWhatsChat,
	NestWhatsMessageContent,
	NestWhatsParticipant,
} from "nestwhats";
import { activityOf, isMuted } from "../chat-store.js";
import { toCanonicalJid, toNativeJid } from "./jid.js";
import { toSendContent } from "./media.js";
import { type BaileysMessage, sendAndWrap } from "./message.js";
import type { BaileysSocketHandle } from "./socket-handle.js";
import { toMillis } from "./timestamp.js";

/** How long a mute lasts, in milliseconds — WhatsApp's own three choices. */
export const MuteDuration = {
	EightHours: 8 * 60 * 60_000,
	OneWeek: 7 * 24 * 60 * 60_000,
} as const;

/**
 * How long a message survives in a disappearing chat, in seconds. WhatsApp
 * accepts these four and nothing else.
 */
export const DisappearingDuration = {
	Off: 0,
	TwentyFourHours: 86_400,
	SevenDays: 604_800,
	NinetyDays: 7_776_000,
} as const;

/** A group inside a community, as WhatsApp lists them — lighter than a chat. */
export interface BaileysLinkedGroup {
	/** Canonical id of the group. */
	id: string;
	name: string;
	/** Member count, when WhatsApp reports it. */
	size?: number;
	/** Epoch milliseconds, when WhatsApp reports it. */
	createdAt?: number;
}

/**
 * Baileys chat.
 *
 * Baileys has no chat object of its own for a direct conversation — the jid is
 * the whole chat — and describes a group by its `GroupMetadata`. What a chat
 * list needs besides that (name, unread count, archived, pinned, muted, last
 * activity) comes from the adapter's own {@link ChatStore}, built from the
 * events Baileys emits; with the store off those fields are undefined, since
 * nothing else reports them.
 *
 * `raw` is the group's metadata when there is one, otherwise Baileys' own
 * `Chat` from the store, and undefined for a chat nothing is known about yet.
 *
 * Every chat can be archived, pinned, muted, marked read or unread, cleared
 * and deleted — those are conversation operations, not group ones. What is
 * group-only is membership and settings, and a community adds linking groups
 * to it.
 */
export class BaileysChat
	implements NestWhatsChat<GroupMetadata | Chat | undefined>
{
	/** Builds the chat for a native jid, fetching the metadata when it is a group. */
	public static async fetch(
		handle: BaileysSocketHandle,
		nativeJid: string,
	): Promise<BaileysChat> {
		const metadata = isJidGroup(nativeJid)
			? await handle.socket.groupMetadata(nativeJid)
			: undefined;
		return new BaileysChat(nativeJid, metadata, handle);
	}

	public constructor(
		private readonly jid: string,
		private readonly metadata: GroupMetadata | undefined,
		private readonly handle: BaileysSocketHandle,
	) {
		if (!isJidGroup(jid)) return;
		const socket = () => this.handle.socket;
		const ids = (participantIds: string[]) => participantIds.map(toNativeJid);

		this.getParticipants = async () => {
			// Fetched fresh rather than read from `metadata`: what a chat was
			// built with is a snapshot, and membership is what changes most.
			const { participants } = await socket().groupMetadata(jid);
			return participants.map((p) => ({
				id: toCanonicalJid(p.id),
				isAdmin: !!p.admin,
			}));
		};
		this.addParticipants = async (p) =>
			void (await socket().groupParticipantsUpdate(jid, ids(p), "add"));
		this.removeParticipants = async (p) =>
			void (await socket().groupParticipantsUpdate(jid, ids(p), "remove"));
		this.promoteParticipants = async (p) =>
			void (await socket().groupParticipantsUpdate(jid, ids(p), "promote"));
		this.demoteParticipants = async (p) =>
			void (await socket().groupParticipantsUpdate(jid, ids(p), "demote"));
		this.setSubject = (subject) => socket().groupUpdateSubject(jid, subject);
		this.setDescription = (description) =>
			socket().groupUpdateDescription(jid, description);
		this.setPicture = async (media) =>
			void (await socket().updateProfilePicture(jid, media.data));
		this.getInviteCode = async () => {
			const code = await socket().groupInviteCode(jid);
			if (!code) throw new Error("[NestWhats] Baileys returned no invite code");
			return code;
		};
		this.revokeInvite = async () => {
			const code = await socket().groupRevokeInvite(jid);
			if (!code) throw new Error("[NestWhats] Baileys returned no invite code");
			return code;
		};
		this.leave = () => socket().groupLeave(jid);
		this.setMemberAddMode = (mode) =>
			socket().groupMemberAddMode(
				jid,
				mode === "admins" ? "admin_add" : "all_member_add",
			);
		this.setAnnouncementOnly = (announcementOnly) =>
			socket().groupSettingUpdate(
				jid,
				announcementOnly ? "announcement" : "not_announcement",
			);
		this.setLocked = (locked) =>
			socket().groupSettingUpdate(jid, locked ? "locked" : "unlocked");
		this.setJoinApprovalMode = (required) =>
			socket().groupJoinApprovalMode(jid, required ? "on" : "off");
		this.getJoinRequests = async () => {
			const requests = await socket().groupRequestParticipantsList(jid);
			return requests
				.map((r) => r.jid)
				.filter((id): id is string => !!id)
				.map(toCanonicalJid);
		};
		this.reviewJoinRequests = async (participantIds, approve) =>
			void (await socket().groupRequestParticipantsUpdate(
				jid,
				ids(participantIds),
				approve ? "approve" : "reject",
			));

		if (!this.metadata?.isCommunity) return;
		this.getLinkedGroups = async () => {
			const { linkedGroups } = await socket().communityFetchLinkedGroups(jid);
			return linkedGroups
				.filter((g): g is typeof g & { id: string } => !!g.id)
				.map((g) => ({
					id: toCanonicalJid(g.id),
					name: g.subject,
					size: g.size,
					createdAt: g.creation ? g.creation * 1000 : undefined,
				}));
		};
		this.linkGroup = (groupId) =>
			socket().communityLinkGroup(toNativeJid(groupId), jid);
		this.unlinkGroup = (groupId) =>
			socket().communityUnlinkGroup(toNativeJid(groupId), jid);
		this.createLinkedGroup = async (subject, participantIds) => {
			const created = await socket().communityCreateGroup(
				subject,
				ids(participantIds),
				jid,
			);
			if (!created) {
				throw new Error(
					`[NestWhats] Could not create group "${subject}" in community ${this.id}`,
				);
			}
			return new BaileysChat(created.id, created, this.handle);
		};
	}

	/** What the store knows about this chat, when it is on and has seen it. */
	private get stored(): Chat | undefined {
		return this.handle.chats?.get(this.jid);
	}

	public get raw(): GroupMetadata | Chat | undefined {
		return this.metadata ?? this.stored;
	}

	public get id() {
		return toCanonicalJid(this.jid);
	}

	public get name() {
		// A group's subject is authoritative; a direct chat is named by the
		// store, which is the only place the contact's name reaches a chat.
		return this.metadata?.subject ?? this.stored?.name ?? undefined;
	}

	public get description() {
		return this.metadata?.desc ?? undefined;
	}

	public get isGroup() {
		return !!isJidGroup(this.jid);
	}

	/** A community: a group that holds groups. */
	public get isCommunity() {
		return !!this.metadata?.isCommunity;
	}

	public get unreadCount() {
		const stored = this.stored;
		if (!stored) return undefined;
		// WhatsApp reports a chat marked unread by hand as a negative count.
		const count = stored.unreadCount ?? undefined;
		return count === undefined ? undefined : Math.max(count, 0);
	}

	/** The chat was marked unread by hand, rather than having unread messages. */
	public get markedUnread() {
		return this.stored?.markedAsUnread ?? undefined;
	}

	public get lastMessageAt() {
		const stored = this.stored;
		if (!stored) return undefined;
		const at = activityOf(stored);
		return at === 0 ? undefined : at;
	}

	public get archived() {
		return this.stored?.archived ?? undefined;
	}

	public get pinned() {
		const pinned = this.stored?.pinned;
		// WhatsApp stamps when it was pinned rather than saying whether it is.
		return pinned === undefined || pinned === null ? undefined : pinned > 0;
	}

	public get muted() {
		const stored = this.stored;
		return stored ? isMuted(stored) : undefined;
	}

	/** Epoch milliseconds when the mute ends, when one is in force. */
	public get mutedUntil() {
		const stored = this.stored;
		if (!stored || !isMuted(stored)) return undefined;
		const endsAt = toMillis(stored.muteEndTime);
		return endsAt > 0 ? endsAt : undefined;
	}

	public async sendMessage(
		content: NestWhatsMessageContent,
	): Promise<BaileysMessage> {
		return sendAndWrap(this.handle, this.jid, toSendContent(content));
	}

	/**
	 * Archives the chat, or takes it out of the archive.
	 *
	 * WhatsApp syncs this across the account's devices by the last message it
	 * saw, so the operations that carry one need a message this client has
	 * seen in the chat.
	 */
	public async archive(archived = true): Promise<void> {
		await this.handle.socket.chatModify(
			{ archive: archived, lastMessages: [this.requireMarker("archive")] },
			this.jid,
		);
	}

	/** Pins the chat to the top of the list, or unpins it. */
	public async pin(pinned = true): Promise<void> {
		await this.handle.socket.chatModify({ pin: pinned }, this.jid);
	}

	/**
	 * Silences notifications for a while.
	 *
	 * @param durationMs - how long, or `null` to unmute. WhatsApp's own
	 * choices are in {@link MuteDuration}; anything else is accepted and a
	 * very long duration is how "mute forever" is expressed.
	 */
	public async mute(durationMs: number | null): Promise<void> {
		await this.handle.socket.chatModify({ mute: durationMs }, this.jid);
	}

	/** Marks everything up to the last message received as read. */
	public async markRead(): Promise<void> {
		await this.handle.socket.chatModify(
			{ markRead: true, lastMessages: [this.requireMarker("markRead")] },
			this.jid,
		);
	}

	/** Marks the chat unread — the blue dot, with no unread messages behind it. */
	public async markUnread(): Promise<void> {
		await this.handle.socket.chatModify(
			{ markRead: false, lastMessages: [this.requireMarker("markUnread")] },
			this.jid,
		);
	}

	/**
	 * Turns disappearing messages on for this chat, or off with
	 * {@link DisappearingDuration.Off}.
	 *
	 * A group and a direct chat are set through different calls in WhatsApp's
	 * protocol; which one is used is decided here rather than by the caller.
	 */
	public async setDisappearing(durationSeconds: number): Promise<void> {
		if (this.isGroup) {
			await this.handle.socket.groupToggleEphemeral(this.jid, durationSeconds);
			return;
		}
		await this.handle.socket.sendMessage(this.jid, {
			disappearingMessagesInChat: durationSeconds || false,
		});
	}

	/** Empties the conversation for this account, keeping the chat itself. */
	public async clearMessages(): Promise<void> {
		await this.handle.socket.chatModify(
			{ clear: true, lastMessages: [this.requireMarker("clearMessages")] },
			this.jid,
		);
	}

	/** Removes the chat from this account's list, messages and all. */
	public async delete(): Promise<void> {
		await this.handle.socket.chatModify(
			{ delete: true, lastMessages: [this.requireMarker("delete")] },
			this.jid,
		);
		this.handle.chats?.remove([this.jid]);
	}

	/**
	 * The message WhatsApp wants as the marker for a chat modification: the
	 * last one received, since that is what its own clients send. A chat this
	 * client has not seen a message in has no marker, and sending a malformed
	 * modification risks the account being logged out of every device — so
	 * this refuses rather than guessing.
	 */
	private requireMarker(operation: string): MinimalMessage {
		const marker =
			this.handle.lastReceived(this.jid) ?? this.handle.lastMessage(this.jid);
		if (!marker) {
			throw new Error(
				`[NestWhats] Cannot ${operation} "${this.id}": Baileys keeps no message store, so this needs a message seen in the chat since the client connected. Wait for one, or use the raw socket if you have the message yourself.`,
			);
		}
		return marker;
	}

	/**
	 * Group members and management, assigned in the constructor and only for a
	 * group.
	 *
	 * They are instance properties rather than methods on purpose: the contract
	 * says a member answers for itself, so `if (chat.addParticipants)` has to be
	 * false on a direct chat. A method on the prototype would always be there.
	 */
	public readonly getParticipants?: () => Promise<NestWhatsParticipant[]>;
	public readonly addParticipants?: (participantIds: string[]) => Promise<void>;
	public readonly removeParticipants?: (
		participantIds: string[],
	) => Promise<void>;
	public readonly promoteParticipants?: (
		participantIds: string[],
	) => Promise<void>;
	public readonly demoteParticipants?: (
		participantIds: string[],
	) => Promise<void>;
	public readonly setSubject?: (subject: string) => Promise<void>;
	public readonly setDescription?: (description: string) => Promise<void>;
	/** Changes the group's photo. */
	public readonly setPicture?: (media: {
		data: Buffer;
		mimetype: string;
	}) => Promise<void>;
	public readonly getInviteCode?: () => Promise<string>;
	public readonly revokeInvite?: () => Promise<string>;
	public readonly leave?: () => Promise<void>;
	/** Who may add participants: admins only, or every member. */
	public readonly setMemberAddMode?: (
		mode: "admins" | "members",
	) => Promise<void>;
	/** Only admins may post. */
	public readonly setAnnouncementOnly?: (
		announcementOnly: boolean,
	) => Promise<void>;
	/** Only admins may change the subject, description and photo. */
	public readonly setLocked?: (locked: boolean) => Promise<void>;
	/** New members need an admin's approval. */
	public readonly setJoinApprovalMode?: (required: boolean) => Promise<void>;
	/** Canonical ids waiting for approval, when join approval is on. */
	public readonly getJoinRequests?: () => Promise<string[]>;
	public readonly reviewJoinRequests?: (
		participantIds: string[],
		approve: boolean,
	) => Promise<void>;

	/**
	 * Community management, assigned only when `isCommunity`, for the same
	 * reason as above: `if (chat.linkGroup)` has to be false on a plain group.
	 */
	public readonly getLinkedGroups?: () => Promise<BaileysLinkedGroup[]>;
	/** Puts an existing group into this community. Admin of both required. */
	public readonly linkGroup?: (groupId: string) => Promise<void>;
	public readonly unlinkGroup?: (groupId: string) => Promise<void>;
	/** Creates a group already inside this community. */
	public readonly createLinkedGroup?: (
		subject: string,
		participantIds: string[],
	) => Promise<BaileysChat>;
}
