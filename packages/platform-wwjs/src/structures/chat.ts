import type {
	NestWhatsChat,
	NestWhatsMessageContent,
	NestWhatsParticipant,
} from "nestwhats";
import type { Chat, GroupChat } from "whatsapp-web.js";
import { toCanonicalJid, toNativeJid } from "./jid.js";
import { toSendArgs } from "./media.js";
import { WWebJsMessage } from "./message.js";

/** whatsapp-web.js chat. The native `Chat` is available on `raw`. */
export class WWebJsChat implements NestWhatsChat<Chat> {
	public constructor(public readonly raw: Chat) {
		if (!raw.isGroup) return;
		const group = raw as GroupChat;
		const ids = (participantIds: string[]) => participantIds.map(toNativeJid);

		this.addParticipants = async (p) =>
			void (await group.addParticipants(ids(p)));
		this.removeParticipants = async (p) =>
			void (await group.removeParticipants(ids(p)));
		this.promoteParticipants = async (p) =>
			void (await group.promoteParticipants(ids(p)));
		this.demoteParticipants = async (p) =>
			void (await group.demoteParticipants(ids(p)));
		this.setSubject = async (subject) => void (await group.setSubject(subject));
		this.setDescription = async (description) =>
			void (await group.setDescription(description));
		this.getInviteCode = () => group.getInviteCode();
		// whatsapp-web.js types this as Promise<void>, but its implementation
		// returns `codeRes.code` — the new invite code. Returning it is the only
		// way to use the method without calling getInviteCode again right after.
		// Verified against 1.34.7; the cast goes when the typings catch up.
		this.revokeInvite = async () =>
			(await group.revokeInvite()) as unknown as string;
		this.leave = async () => void (await group.leave());
	}

	public get id() {
		return toCanonicalJid(this.raw.id._serialized);
	}

	public get name() {
		return this.raw.name;
	}

	public get isGroup() {
		return this.raw.isGroup;
	}

	public get description() {
		// Only GroupChat carries it, and only when the group has one set.
		return this.raw.isGroup
			? ((this.raw as GroupChat).description ?? undefined)
			: undefined;
	}

	public get unreadCount() {
		return this.raw.unreadCount;
	}

	public get lastMessageAt() {
		return this.raw.timestamp ? this.raw.timestamp * 1000 : undefined;
	}

	public get archived() {
		return this.raw.archived;
	}

	public get pinned() {
		return this.raw.pinned;
	}

	public get muted() {
		return this.raw.isMuted;
	}

	public async sendMessage(
		content: NestWhatsMessageContent,
	): Promise<WWebJsMessage> {
		const [payload, options] = toSendArgs(content);
		const sent = await this.raw.sendMessage(payload, options);
		return new WWebJsMessage(sent);
	}

	public async getParticipants(): Promise<NestWhatsParticipant[]> {
		if (!this.raw.isGroup) return [];
		const group = this.raw as GroupChat;
		return group.participants.map((p) => ({
			id: toCanonicalJid(p.id._serialized),
			isAdmin: p.isAdmin || p.isSuperAdmin,
		}));
	}

	/**
	 * Group management, assigned in the constructor and only for a group.
	 *
	 * They are instance properties rather than methods on purpose: the contract
	 * says a member answers for itself, so `if (chat.addParticipants)` has to be
	 * false on a direct chat. A method on the prototype would always be there.
	 */
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
	public readonly getInviteCode?: () => Promise<string>;
	public readonly revokeInvite?: () => Promise<string>;
	public readonly leave?: () => Promise<void>;
}
