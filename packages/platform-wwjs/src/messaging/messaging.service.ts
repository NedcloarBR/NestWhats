import { Injectable } from "@nestjs/common";
import { type MessagingOptions, NestWhatsMessagingService } from "nestwhats";
import type {
	Client,
	Message,
	MessageMedia,
	MessageSendOptions,
} from "whatsapp-web.js";
import { toNativeJid } from "../structures/index.js";

/**
 * Options for {@link WhatsAppWebJsMessagingService.sendRawMedia}: the client to
 * send from, plus whatsapp-web.js' full `MessageSendOptions`.
 */
export interface RawSendOptions extends MessagingOptions {
	sendOptions?: MessageSendOptions;
}

/**
 * whatsapp-web.js escape hatch.
 *
 * Sending media, presence, read receipts and revokes are portable now and live
 * on `NestWhatsMessagingService`, which this extends — use those unless you
 * need something whatsapp-web.js alone offers, such as buttons, link previews
 * or a sticker built from its own `MessageMedia`.
 */
@Injectable()
export class WhatsAppWebJsMessagingService extends NestWhatsMessagingService {
	private getRawClient(clientName?: string): Client {
		return this.getAdapter(clientName).raw as Client;
	}

	/**
	 * Sends a native `MessageMedia` with the full `MessageSendOptions` surface.
	 * Ids are normalised first, so a canonical id taken from a message works
	 * here exactly as it does on the portable methods.
	 */
	public async sendRawMedia(
		chatId: string,
		media: MessageMedia,
		options?: RawSendOptions,
	): Promise<Message> {
		const client = this.getRawClient(options?.client);
		return client.sendMessage(toNativeJid(chatId), media, options?.sendOptions);
	}
}
