import { Injectable } from "@nestjs/common";
import { Chat, Command, Message, NestWhatsMessage } from "nestwhats";
import { NotifierService } from "./notifier.service.js";

@Injectable()
export class InvoiceHandler {
	public constructor(private readonly notifier: NotifierService) {}

	@Command({ name: "report", description: "Sends this month as a PDF" })
	public async onReport(@Chat() chatId: string) {
		await this.notifier.sendReport(chatId);
	}

	@Command({ name: "slow", description: "Shows the typing indicator" })
	public async onSlow(@Chat() chatId: string) {
		await this.notifier.answerSlowly(chatId, async () => {
			await new Promise((resolve) => setTimeout(resolve, 3_000));
			return "that took a while";
		});
	}

	// A reply quotes the original, which is what people expect in a group.
	@Command({ name: "quote", description: "Replies quoting you" })
	public async onQuote(@Message() message: NestWhatsMessage) {
		await message.reply("you said that");
	}
}
