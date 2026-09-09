import { Injectable } from "@nestjs/common";
import {
	Args,
	Arguments,
	Author,
	Chat,
	Command,
	Message,
	NestWhatsMessage,
	ParseArgs,
} from "nestwhats";
import { BanDto } from "./ban.dto.js";

@Injectable()
export class EchoHandler {
	// `aliases` reach the same handler, so `!say` works too.
	@Command({
		name: "echo",
		description: "Repeats what you said",
		aliases: ["say"],
	})
	public async onEcho(
		@Message() message: NestWhatsMessage,
		@Args() args: string,
	) {
		await message.reply(args || "you said nothing");
	}

	// `prefix` overrides the client's for this command alone: `.version`.
	@Command({ name: "version", description: "Shows the version", prefix: "." })
	public async onVersion(@Message() message: NestWhatsMessage) {
		await message.reply("v4");
	}

	// Every parameter decorator, in one signature.
	@Command({ name: "whoami", description: "Tells you who you are" })
	public async onWhoAmI(
		@Message() message: NestWhatsMessage,
		@Author() authorId: string,
		@Chat() chatId: string,
	) {
		await message.reply(`you are ${authorId}, writing in ${chatId}`);
	}

	// The pipe parses `!ban 5511999998888 spamming the group` into the DTO.
	@Command({ name: "ban", description: "Bans someone" })
	public async onBan(
		@Message() message: NestWhatsMessage,
		@Arguments(ParseArgs) dto: BanDto,
	) {
		await message.reply(`would ban ${dto.user} for: ${dto.reason}`);
	}
}
