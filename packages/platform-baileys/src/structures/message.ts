import {
	type AnyMessageContent,
	areJidsSameUser,
	type Contact,
	downloadMediaMessage,
	generateMessageIDV2,
	getContentType,
	isJidStatusBroadcast,
	isLidUser,
	isPnUser,
	jidNormalizedUser,
	type MiscMessageGenerationOptions,
	normalizeMessageContent,
	proto,
	type WAMessage,
	type WAMessageKey,
} from "@whiskeysockets/baileys";
import {
	type NestWhatsMedia,
	type NestWhatsMessage,
	type NestWhatsMessageContent,
	NestWhatsMessageType,
} from "nestwhats";
import { BaileysChat } from "./chat.js";
import { BaileysContact } from "./contact.js";
import { toCanonicalJid, toNativeJid } from "./jid.js";
import { findMediaContent, toNestWhatsMedia, toSendContent } from "./media.js";
import { MESSAGE_TYPE_MAP } from "./message-type.map.js";
import type { BaileysSocketHandle } from "./socket-handle.js";
import { toMillis } from "./timestamp.js";

/** WhatsApp stops accepting an edit about fifteen minutes after sending. */
const EDIT_WINDOW_MS = 15 * 60_000;

/** Media kinds whose caption WhatsApp lets you edit. Audio and stickers have none. */
const CAPTION_KINDS = new Set<keyof proto.IMessage>([
	"imageMessage",
	"videoMessage",
	"documentMessage",
]);

/**
 * Sends through the handle's socket and wraps the answer.
 *
 * Baileys types `sendMessage` as possibly answering nothing; it does so when
 * the content generated no message at all, which for the shapes sent here
 * would be a bug rather than an outcome, so it is an error.
 */
export async function sendAndWrap(
	handle: BaileysSocketHandle,
	jid: string,
	content: AnyMessageContent,
	options?: MiscMessageGenerationOptions,
): Promise<BaileysMessage> {
	const sent = await handle.socket.sendMessage(jid, content, options);
	if (!sent) {
		throw new Error(
			`[NestWhats] Baileys did not return the message sent to ${jid}`,
		);
	}
	handle.remember(sent);
	return new BaileysMessage(sent, handle);
}

/**
 * Baileys message.
 *
 * The properties below are the portable contract every adapter honours.
 * Everything Baileys exposes — `pushName`, `messageStubType`, `userReceipt`,
 * and whatever a future release adds — is on `raw`, fully typed as
 * `WAMessage`.
 */
export class BaileysMessage implements NestWhatsMessage<WAMessage> {
	public constructor(
		public readonly raw: WAMessage,
		private readonly handle: BaileysSocketHandle,
	) {}

	/** The content with ephemeral / view-once / edited wrappers removed. */
	private get content(): proto.IMessage | undefined {
		return normalizeMessageContent(this.raw.message);
	}

	private get contentType(): keyof proto.IMessage | undefined {
		return getContentType(this.content);
	}

	private get contextInfo(): proto.IContextInfo | undefined {
		const type = this.contentType;
		if (!type) return undefined;
		const inner = this.content?.[type];
		return inner && typeof inner === "object" && "contextInfo" in inner
			? (inner.contextInfo ?? undefined)
			: undefined;
	}

	private get nativeJid(): string {
		return this.raw.key.remoteJid ?? "";
	}

	public get id() {
		return this.raw.key.id ?? "";
	}

	public get chatId() {
		return toCanonicalJid(this.nativeJid);
	}

	public get senderId() {
		const { participant, fromMe } = this.raw.key;
		if (participant) return toCanonicalJid(participant);
		if (fromMe) {
			const me = this.handle.user;
			if (me) return toCanonicalJid(jidNormalizedUser(me.id));
		}
		return toCanonicalJid(this.nativeJid);
	}

	public get fromMe() {
		return !!this.raw.key.fromMe;
	}

	public get body() {
		const content = this.content;
		if (!content) return "";
		return (
			content.conversation ??
			content.extendedTextMessage?.text ??
			content.imageMessage?.caption ??
			content.videoMessage?.caption ??
			content.documentMessage?.caption ??
			""
		);
	}

	public get type() {
		const type = this.contentType;
		if (!type) return NestWhatsMessageType.Unknown;
		if (type === "protocolMessage") {
			return this.content?.protocolMessage?.type ===
				proto.Message.ProtocolMessage.Type.REVOKE
				? NestWhatsMessageType.Revoked
				: NestWhatsMessageType.Unknown;
		}
		if (type === "audioMessage" && this.content?.audioMessage?.ptt) {
			return NestWhatsMessageType.Voice;
		}
		return MESSAGE_TYPE_MAP[type] ?? NestWhatsMessageType.Unknown;
	}

	public get timestamp() {
		return toMillis(this.raw.messageTimestamp);
	}

	public get hasMedia() {
		return findMediaContent(this.raw.message) !== undefined;
	}

	public get isForwarded() {
		const info = this.contextInfo;
		return !!info?.isForwarded || (info?.forwardingScore ?? 0) > 0;
	}

	public get isStatus() {
		return isJidStatusBroadcast(this.nativeJid);
	}

	public get hasQuotedMessage() {
		return !!this.contextInfo?.quotedMessage;
	}

	public get mentionedIds() {
		return (this.contextInfo?.mentionedJid ?? []).map(toCanonicalJid);
	}

	public async reply(
		content: NestWhatsMessageContent,
	): Promise<BaileysMessage> {
		return sendAndWrap(this.handle, this.nativeJid, toSendContent(content), {
			quoted: this.raw,
		});
	}

	public async downloadMedia(): Promise<NestWhatsMedia | undefined> {
		const media = findMediaContent(this.raw.message);
		if (!media) return undefined;
		// Media expires on WhatsApp's servers; `reuploadRequest` asks the phone
		// for it once, and an old message that is gone there too answers with
		// undefined rather than throwing.
		const data = await downloadMediaMessage(
			this.raw,
			"buffer",
			{},
			{
				logger: this.handle.baileysLogger,
				reuploadRequest: this.handle.socket.updateMediaMessage,
			},
		).catch(() => undefined);
		return data ? toNestWhatsMedia(data, media.content) : undefined;
	}

	/** Stars the message for this account, or unstars it. */
	public async star(starred = true): Promise<void> {
		await this.handle.socket.chatModify(
			{
				star: {
					messages: [{ id: this.id, fromMe: this.fromMe }],
					star: starred,
				},
			},
			this.nativeJid,
		);
	}

	/**
	 * Pins the message to the top of the chat, for everyone in it.
	 *
	 * @param durationSeconds - how long it stays pinned; WhatsApp allows 24
	 * hours, 7 days or 30 days, and nothing else.
	 */
	public async pin(
		durationSeconds: 86400 | 604800 | 2592000 = 604800,
	): Promise<void> {
		await this.handle.socket.sendMessage(this.nativeJid, {
			pin: this.raw.key,
			type: proto.PinInChat.Type.PIN_FOR_ALL,
			time: durationSeconds,
		});
	}

	public async unpin(): Promise<void> {
		await this.handle.socket.sendMessage(this.nativeJid, {
			pin: this.raw.key,
			type: proto.PinInChat.Type.UNPIN_FOR_ALL,
		});
	}

	public async react(emoji: string): Promise<void> {
		await this.handle.socket.sendMessage(this.nativeJid, {
			react: { text: emoji, key: this.raw.key },
		});
	}

	public async edit(content: string): Promise<BaileysMessage | undefined> {
		// The two refusals that are not failures, answered as the contract says:
		// not this account's message, or past WhatsApp's edit window. Baileys
		// does not check either — the phone would silently ignore the edit.
		if (!this.fromMe) return undefined;
		if (Date.now() - this.timestamp > EDIT_WINDOW_MS) return undefined;

		const type = this.contentType;
		const current = this.content;
		if (!type || !current) return undefined;

		let edited: proto.IMessage;
		if (type === "conversation" || type === "extendedTextMessage") {
			await this.handle.socket.sendMessage(this.nativeJid, {
				text: content,
				edit: this.raw.key,
			});
			edited =
				type === "conversation"
					? { conversation: content }
					: {
							extendedTextMessage: {
								...current.extendedTextMessage,
								text: content,
							},
						};
		} else if (CAPTION_KINDS.has(type)) {
			// A caption edit re-sends the media node with the new caption inside a
			// protocol message, keeping the existing upload; going through
			// `sendMessage` with `edit` would upload the bytes again.
			edited = { [type]: { ...current[type], caption: content } };
			await this.handle.socket.relayMessage(
				this.nativeJid,
				{
					protocolMessage: {
						key: this.raw.key,
						editedMessage: edited,
						timestampMs: Date.now(),
						type: proto.Message.ProtocolMessage.Type.MESSAGE_EDIT,
					},
				},
				{ messageId: generateMessageIDV2(this.handle.user?.id) },
			);
		} else {
			return undefined;
		}

		// What Baileys answers is the protocol envelope, under a new id; what the
		// contract promises is the message as it now reads, under its own.
		return new BaileysMessage({ ...this.raw, message: edited }, this.handle);
	}

	public async forward(chatId: string): Promise<void> {
		await this.handle.socket.sendMessage(toNativeJid(chatId), {
			forward: this.raw,
		});
	}

	public async delete(forEveryone?: boolean): Promise<void> {
		if (forEveryone) {
			await this.handle.socket.sendMessage(this.nativeJid, {
				delete: this.raw.key,
			});
			return;
		}
		await this.handle.socket.chatModify(
			{
				deleteForMe: {
					deleteMedia: true,
					key: this.raw.key,
					timestamp: Math.floor(this.timestamp / 1000),
				},
			},
			this.nativeJid,
		);
	}

	public async getChat(): Promise<BaileysChat> {
		return BaileysChat.fetch(this.handle, this.nativeJid);
	}

	public async getContact(): Promise<BaileysContact> {
		const { key } = this.raw;
		const me = this.handle.user;
		const sender = key.participant ?? (key.fromMe ? me?.id : key.remoteJid);
		if (!sender) {
			throw new Error(`[NestWhats] Message ${this.id} carries no sender`);
		}
		// Since the LID migration a sender arrives in one addressing form with
		// the other on the `*Alt` field; both are kept so the phone number is
		// known whenever WhatsApp revealed it. A message this account sent in a
		// direct chat names the *peer* on the alt field, not this account.
		const alt = key.participant
			? key.participantAlt
			: key.fromMe
				? me?.lid
				: key.remoteJidAlt;
		const candidates = [sender, alt].filter((id): id is string => !!id);
		const pn = candidates.find((id) => isPnUser(id));
		const lid = candidates.find((id) => isLidUser(id));
		const contact: Contact = {
			id: jidNormalizedUser(sender),
			lid: lid ? jidNormalizedUser(lid) : undefined,
			phoneNumber: pn ? jidNormalizedUser(pn) : undefined,
			notify: key.fromMe ? me?.name : (this.raw.pushName ?? undefined),
		};
		return new BaileysContact(contact, this.handle);
	}

	public async getQuotedMessage(): Promise<BaileysMessage | undefined> {
		const info = this.contextInfo;
		if (!info?.quotedMessage) return undefined;
		// Baileys carries the quoted content and its key, not the original
		// message: the reconstruction has no timestamp (it reads as 0) and no
		// push name, but its key is real, so replying to or reacting on it works.
		const me = this.handle.user;
		const participant = info.participant ?? undefined;
		const fromMe =
			!!me &&
			!!participant &&
			(areJidsSameUser(me.id, participant) ||
				(!!me.lid && areJidsSameUser(me.lid, participant)));
		const key: WAMessageKey = {
			remoteJid: info.remoteJid ?? this.nativeJid,
			id: info.stanzaId,
			participant,
			fromMe,
		};
		return new BaileysMessage(
			{ key, message: info.quotedMessage },
			this.handle,
		);
	}
}
