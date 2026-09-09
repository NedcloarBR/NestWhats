import { Injectable } from "@nestjs/common";
import {
	Client,
	Command,
	Message,
	NestWhatsClient,
	NestWhatsMessage,
} from "nestwhats";

@Injectable()
export class ChatsHandler {
	/**
	 * Baileys keeps no chat list of its own — its documentation is explicit
	 * that maintaining one is the application's job — so the adapter keeps it,
	 * from the events WhatsApp sends. That store is what makes direct
	 * conversations listable at all, and what fills the fields below.
	 *
	 * A client that has just linked knows little until WhatsApp has sent it
	 * something; `syncFullHistory` decides how much arrives on that first link.
	 */
	@Command({ name: "unread", description: "Lists chats with unread messages" })
	public async onUnread(
		@Message() message: NestWhatsMessage,
		@Client() client: NestWhatsClient,
	) {
		const chats = await client.getChats();
		const unread = chats.filter((chat) => chat.unreadCount > 0);

		await message.reply(
			unread.map((c) => `${c.name}: ${c.unreadCount}`).join("\n") || "all read",
		);
	}

	@Command({ name: "tidy", description: "Archives and mutes this chat" })
	public async onTidy(
		@Message() message: NestWhatsMessage,
		@Client() client: NestWhatsClient,
	) {
		const chat = await client.getChat(message.chatId);
		await chat?.markRead();
		await chat?.mute(8 * 60 * 60 * 1000);
		await chat?.archive();
	}
}
