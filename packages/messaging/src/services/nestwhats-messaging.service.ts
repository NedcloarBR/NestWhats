import { Injectable } from "@nestjs/common";
import { ClientsRegistryService, NestWhatsEvents } from "nestwhats";
import { Message, MessageMedia, MessageSendOptions } from "whatsapp-web.js";

export type PresenceState = "typing" | "recording" | "paused";

export type EventHandler<K extends keyof NestWhatsEvents> =
	NestWhatsEvents[K] extends unknown[]
		? (...args: NestWhatsEvents[K]) => void
		: () => void;

export interface MessagingOptions {
	client?: string;
}

export interface MediaMessagingOptions extends MessagingOptions {
	sendOptions?: MessageSendOptions;
}

@Injectable()
export class NestWhatsMessagingService {
	constructor(private readonly registry: ClientsRegistryService) {}

	on<K extends keyof NestWhatsEvents>(
		event: K,
		handler: EventHandler<K>,
		options?: MessagingOptions,
	): () => void {
		const client = this.registry.get(options?.client);
		client.on(event as string, handler as (...args: unknown[]) => void);
		return () =>
			client.off(event as string, handler as (...args: unknown[]) => void);
	}

	once<K extends keyof NestWhatsEvents>(
		event: K,
		handler: EventHandler<K>,
		options?: MessagingOptions,
	): void {
		const client = this.registry.get(options?.client);
		client.once(event as string, handler as (...args: unknown[]) => void);
	}

	off<K extends keyof NestWhatsEvents>(
		event: K,
		handler: EventHandler<K>,
		options?: MessagingOptions,
	): void {
		const client = this.registry.get(options?.client);
		client.off(event as string, handler as (...args: unknown[]) => void);
	}

	async sendText(
		chatId: string,
		content: string,
		options?: MessagingOptions,
	): Promise<Message> {
		const client = this.registry.get(options?.client);
		return client.sendMessage(chatId, content);
	}

	async sendMedia(
		chatId: string,
		media: MessageMedia,
		options?: MediaMessagingOptions,
	): Promise<Message> {
		const client = this.registry.get(options?.client);
		return client.sendMessage(chatId, media, options?.sendOptions);
	}

	async sendPresence(
		chatId: string,
		state: PresenceState,
		options?: MessagingOptions,
	): Promise<void> {
		const client = this.registry.get(options?.client);
		const chat = await client.getChatById(chatId);

		if (state === "typing") await chat.sendStateTyping();
		else if (state === "recording") await chat.sendStateRecording();
		else await chat.clearState();
	}

	async sendSeen(chatId: string, options?: MessagingOptions): Promise<void> {
		const client = this.registry.get(options?.client);
		await client.sendSeen(chatId);
	}

	async revokeMessage(
		messageId: string,
		options?: MessagingOptions,
	): Promise<void> {
		const client = this.registry.get(options?.client);
		const message = await client.getMessageById(messageId);
		await message.delete(true);
	}
}
