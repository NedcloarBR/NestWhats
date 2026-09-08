import {
	type NestWhatsMedia,
	type NestWhatsMessage,
	type NestWhatsMessageContent,
	NestWhatsMessageType,
} from "nestwhats";
import type { Message } from "whatsapp-web.js";
import { WWebJsChat } from "./chat.js";
import { WWebJsContact } from "./contact.js";
import { toCanonicalJid, toNativeJid } from "./jid.js";
import { toNestWhatsMedia, toSendArgs } from "./media.js";
import { MESSAGE_TYPE_MAP } from "./message-type.map.js";

/**
 * whatsapp-web.js message.
 *
 * The properties below are the portable contract every adapter honours.
 * Everything whatsapp-web.js exposes — `ack`, `deviceType`, `links`, and
 * whatever a future release adds — is on `raw`, fully typed as `Message`.
 */
export class WWebJsMessage implements NestWhatsMessage<Message> {
	public constructor(public readonly raw: Message) {}

	public get id() {
		return this.raw.id._serialized;
	}

	public get chatId() {
		return toCanonicalJid(this.raw.fromMe ? this.raw.to : this.raw.from);
	}

	public get senderId() {
		return toCanonicalJid(this.raw.author ?? this.raw.from);
	}

	public get fromMe() {
		return this.raw.fromMe;
	}

	public get body() {
		return this.raw.body;
	}

	public get type() {
		return MESSAGE_TYPE_MAP[this.raw.type] ?? NestWhatsMessageType.Unknown;
	}

	public get timestamp() {
		return this.raw.timestamp * 1000;
	}

	public get hasMedia() {
		return this.raw.hasMedia;
	}

	public get isForwarded() {
		return this.raw.isForwarded;
	}

	public get isStatus() {
		return this.raw.isStatus;
	}

	public get hasQuotedMessage() {
		return this.raw.hasQuotedMsg;
	}

	public get mentionedIds() {
		return (this.raw.mentionedIds ?? []).map((id) =>
			toCanonicalJid(
				typeof id === "string"
					? id
					: (id as { _serialized: string })._serialized,
			),
		);
	}

	public async reply(content: NestWhatsMessageContent): Promise<WWebJsMessage> {
		const [payload, options] = toSendArgs(content);
		const replied = await this.raw.reply(payload, undefined, options);
		return new WWebJsMessage(replied);
	}

	public async downloadMedia(): Promise<NestWhatsMedia | undefined> {
		if (!this.raw.hasMedia) return undefined;
		// Media expires on WhatsApp's servers, so an old message answers with
		// undefined rather than throwing.
		const media = await this.raw.downloadMedia().catch(() => undefined);
		return media ? toNestWhatsMedia(media) : undefined;
	}

	public async react(emoji: string): Promise<void> {
		await this.raw.react(emoji);
	}

	public async edit(content: string): Promise<WWebJsMessage | undefined> {
		// whatsapp-web.js answers null for the two refusals that are not
		// failures — not this account's message, or past the edit window — and
		// the contract turns both into undefined.
		const edited = await this.raw.edit(content);
		return edited ? new WWebJsMessage(edited) : undefined;
	}

	public async forward(chatId: string): Promise<void> {
		await this.raw.forward(toNativeJid(chatId));
	}

	public async delete(forEveryone?: boolean): Promise<void> {
		await this.raw.delete(forEveryone);
	}

	public async getChat(): Promise<WWebJsChat> {
		const chat = await this.raw.getChat();
		return new WWebJsChat(chat);
	}

	public async getContact(): Promise<WWebJsContact> {
		const contact = await this.raw.getContact();
		return WWebJsContact.create(contact);
	}

	public async getQuotedMessage(): Promise<WWebJsMessage | undefined> {
		if (!this.raw.hasQuotedMsg) return undefined;
		const quoted = await this.raw.getQuotedMessage();
		return new WWebJsMessage(quoted);
	}
}
