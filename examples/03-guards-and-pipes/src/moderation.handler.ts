import {
	Injectable,
	ParseIntPipe,
	UseFilters,
	UseGuards,
} from "@nestjs/common";
import {
	AdapterCapability,
	Args,
	Arguments,
	Chat,
	Client,
	Command,
	DmOnlyGuard,
	GroupOnlyGuard,
	IsAdminGuard,
	Message,
	NestWhatsClient,
	NestWhatsMessage,
	ParseArgs,
	RequiresCapability,
} from "nestwhats";
import { BusinessHoursGuard } from "./business-hours.guard.js";
import { KickDto } from "./kick.dto.js";
import { UnsupportedFilter } from "./unsupported.filter.js";

@Injectable()
export class ModerationHandler {
	// Guards decide who may run it; the pipe parses what follows the word. A
	// guard refusing is ordinary flow — the handler is skipped, nothing is
	// logged as a failure.
	@Command({ name: "kick", description: "Removes someone from the group" })
	@UseGuards(GroupOnlyGuard, IsAdminGuard)
	public async onKick(
		@Chat() chatId: string,
		@Client() client: NestWhatsClient,
		@Arguments(ParseArgs) { user }: KickDto,
	) {
		const chat = await client.getChat(chatId);
		// Group management is absent on a direct chat, so ask the member itself
		// rather than the adapter.
		await chat?.removeParticipants?.([user]);
	}

	@Command({ name: "secret", description: "Only in a direct chat" })
	@UseGuards(DmOnlyGuard)
	public async onSecret(@Message() message: NestWhatsMessage) {
		await message.reply("nobody else is reading this");
	}

	// Skipped entirely on a client whose platform cannot post a status.
	@Command({ name: "story", description: "Posts a status" })
	@UseGuards(RequiresCapability(AdapterCapability.PostStatus))
	@UseFilters(UnsupportedFilter)
	public async onStory(
		@Client() client: NestWhatsClient,
		@Args() args: string,
	) {
		await client.postStatus(args);
	}

	@Command({ name: "open", description: "Only during business hours" })
	@UseGuards(BusinessHoursGuard)
	public async onOpen(@Message() message: NestWhatsMessage) {
		await message.reply("we are open");
	}

	// Any Nest pipe works: this one refuses anything that is not a number.
	@Command({ name: "age", description: "Checks an age" })
	public async onAge(
		@Message() message: NestWhatsMessage,
		@Args(ParseIntPipe) age: number,
	) {
		await message.reply(`you are ${age}`);
	}
}
