import { Injectable } from "@nestjs/common";
import { Command, Message, NestWhatsMessage } from "nestwhats";

@Injectable()
export class SupportHandler {
	// `client` restricts a command to one number: this never answers on
	// `alerts`, even though both clients share the application.
	@Command({
		name: "hours",
		description: "Opening hours",
		client: "support",
	})
	public async onHours(@Message() message: NestWhatsMessage) {
		await message.reply("9 to 18, Monday to Friday");
	}

	// No `client`, so it answers on both — with each one's own prefix.
	@Command({ name: "ping", description: "Answers with pong" })
	public async onPing(@Message() message: NestWhatsMessage) {
		await message.reply("pong");
	}
}
