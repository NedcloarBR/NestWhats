import { Injectable } from "@nestjs/common";
import type {
	AnyMessageContent,
	MiscMessageGenerationOptions,
	WAMessage,
	WASocket,
} from "@whiskeysockets/baileys";
import { type MessagingOptions, NestWhatsMessagingService } from "nestwhats";
import type { BaileysAdapter } from "../adapter.js";
import type { WebAuthnAssertion } from "../passkey/index.js";
import { toNativeJid } from "../structures/index.js";

/**
 * Options for {@link BaileysMessagingService.sendRaw}: the client to send
 * from, plus Baileys' full `MiscMessageGenerationOptions`.
 */
export interface RawSendOptions extends MessagingOptions {
	sendOptions?: MiscMessageGenerationOptions;
}

/**
 * Baileys escape hatch.
 *
 * Sending media, presence, read receipts, revokes and the social operations
 * are portable and live on `NestWhatsMessagingService`, which this extends —
 * use those unless you need something Baileys alone offers, such as polls,
 * events, albums, location or a contact card. It is also where a passkey
 * challenge is answered by client name, which is what an HTTP endpoint has.
 */
@Injectable()
export class BaileysMessagingService extends NestWhatsMessagingService {
	private getRawSocket(clientName?: string): WASocket {
		return this.getAdapter(clientName).raw as WASocket;
	}

	private getBaileysAdapter(clientName?: string): BaileysAdapter {
		const adapter = this.getAdapter(clientName);
		if (typeof (adapter as BaileysAdapter).resolvePasskey !== "function") {
			throw new Error(
				`[NestWhats] Client "${clientName ?? "default"}" is not a Baileys client`,
			);
		}
		return adapter as BaileysAdapter;
	}

	/**
	 * Answers the `passkeyChallenge` a client is waiting on, from wherever the
	 * assertion arrived — an HTTP endpoint the account holder's browser posted
	 * to, a job that reached a vault. Throws when no challenge is waiting.
	 */
	public resolvePasskey(
		assertion: WebAuthnAssertion,
		options?: MessagingOptions,
	): void {
		this.getBaileysAdapter(options?.client).resolvePasskey(assertion);
	}

	/** Gives up on a client's pending passkey challenge, if any. */
	public rejectPasskey(reason?: unknown, options?: MessagingOptions): void {
		this.getBaileysAdapter(options?.client).rejectPasskey(reason);
	}

	/**
	 * Sends any `AnyMessageContent` with the full `MiscMessageGenerationOptions`
	 * surface. Ids are normalised first, so a canonical id taken from a message
	 * works here exactly as it does on the portable methods.
	 */
	public async sendRaw(
		chatId: string,
		content: AnyMessageContent,
		options?: RawSendOptions,
	): Promise<WAMessage> {
		const socket = this.getRawSocket(options?.client);
		const sent = await socket.sendMessage(
			toNativeJid(chatId),
			content,
			options?.sendOptions,
		);
		if (!sent) {
			throw new Error(
				`[NestWhats] Baileys did not return the message sent to ${chatId}`,
			);
		}
		return sent;
	}
}
