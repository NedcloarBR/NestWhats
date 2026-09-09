import { Injectable, Logger } from "@nestjs/common";
import {
	Command,
	Context,
	ContextOf,
	Message,
	NestWhatsMessage,
	On,
	Once,
} from "nestwhats";

@Injectable()
export class AppHandler {
	private readonly logger = new Logger(AppHandler.name);

	// A command is a message that starts with the client's prefix, so this
	// answers `!ping`.
	@Command({ name: "ping", description: "Answers with pong" })
	public async onPing(@Message() message: NestWhatsMessage) {
		await message.reply("pong");
	}

	@Once("qr")
	public onQr(@Context() [client, qr]: ContextOf<"qr">) {
		this.logger.log(`Scan this to connect ${client.name}: ${qr}`);
	}

	@On("ready")
	public onReady(@Context() [client]: ContextOf<"ready">) {
		this.logger.log(`${client.name} is online`);
	}
}
