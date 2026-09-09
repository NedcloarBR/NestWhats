import { Injectable } from "@nestjs/common";
import {
	Args,
	CommandGroup,
	GroupDefault,
	Message,
	NestWhatsMessage,
	Subcommand,
} from "nestwhats";

/**
 * A group turns one word into a namespace, reached as `!config prefix .`
 */
@Injectable()
@CommandGroup({ name: "config", description: "Bot settings" })
export class ConfigHandler {
	// Runs when the group is called with no subcommand: `!config` on its own.
	@GroupDefault()
	public async onConfig(@Message() message: NestWhatsMessage) {
		await message.reply("usage: !config prefix <char> | !config locale <tag>");
	}

	@Subcommand({ name: "prefix", description: "Changes the prefix" })
	public async onPrefix(
		@Message() message: NestWhatsMessage,
		@Args() args: string,
	) {
		await message.reply(`prefix would become "${args}"`);
	}

	@Subcommand({ name: "locale", description: "Changes the language" })
	public async onLocale(
		@Message() message: NestWhatsMessage,
		@Args() args: string,
	) {
		await message.reply(`locale would become "${args}"`);
	}
}
