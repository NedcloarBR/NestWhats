import { Injectable } from "@nestjs/common";
import { Chat, Command, Message, NestWhatsMessage } from "nestwhats";
import { RoutingService } from "./routing.service.js";

@Injectable()
export class RoutingHandler {
	public constructor(private readonly routing: RoutingService) {}

	// Answers on whichever number received it, but always sends through
	// `alerts` — the injected client, not the one this message arrived on.
	@Command({ name: "alert", description: "Sends through the alerts number" })
	public async onAlert(
		@Message() message: NestWhatsMessage,
		@Chat() chatId: string,
	) {
		await this.routing.alert(chatId, "this came from the alerts number");
		await message.reply("sent");
	}

	@Command({
		name: "via",
		description: "Sends through a client named at runtime",
	})
	public async onVia(
		@Message() message: NestWhatsMessage,
		@Chat() chatId: string,
	) {
		await this.routing.sendAs("support", chatId, "routed by name");
		await message.reply("sent");
	}

	@Command({
		name: "platform",
		description: "Names the platform behind a client",
	})
	public async onPlatform(@Message() message: NestWhatsMessage) {
		await message.reply(this.routing.describe());
	}
}
