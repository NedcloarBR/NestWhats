import { Injectable, Logger } from "@nestjs/common";
import { Context, ContextOf, MessageStatus, On } from "nestwhats";

@Injectable()
export class MessageListener {
	private readonly logger = new Logger(MessageListener.name);

	// Every message the platform surfaces, sent or received. Filter with
	// `fromMe`, or set `ignoreSelf` on the module to drop your own.
	@On("messageUpsert")
	public onMessage(@Context() [client, message]: ContextOf<"messageUpsert">) {
		if (message.fromMe) return;
		this.logger.log(`${client.name} <- ${message.senderId}: ${message.body}`);
	}

	// How far a message this client sent has got. On a platform that cannot
	// report it, subscribing is refused rather than silently never firing.
	@On("messageStatus")
	public onStatus(@Context() [, update]: ContextOf<"messageStatus">) {
		if (update.status === MessageStatus.Failed) {
			this.logger.error(`delivery failed: ${update.error?.message}`);
			return;
		}
		this.logger.debug(`${update.messageId} -> ${update.status}`);
	}

	// Restricted to one client by name; the others never reach this handler.
	@On("ready", { client: "personal" })
	public onPersonalReady() {
		this.logger.log("the personal number is up");
	}
}
