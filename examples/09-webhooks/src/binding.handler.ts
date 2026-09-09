import { Injectable } from "@nestjs/common";
import { NestWhatsWebhookService } from "@nestwhats/webhook";
import { Args, Command, Message, NestWhatsMessage } from "nestwhats";

@Injectable()
export class BindingHandler {
	public constructor(private readonly webhooks: NestWhatsWebhookService) {}

	@Command({ name: "hooks", description: "Lists webhook handlers" })
	public async onHooks(@Message() message: NestWhatsMessage) {
		const all = this.webhooks.getHandlers();
		const bound = this.webhooks.getBoundHandlers({ client: "personal" });

		await message.reply(
			all
				.map((h) => `${bound.includes(h) ? "[on] " : "[off]"} ${h}`)
				.join("\n") || "none",
		);
	}

	@Command({ name: "bind", description: "Binds a webhook handler" })
	public async onBind(
		@Message() message: NestWhatsMessage,
		@Args() handler: string,
	) {
		// If the client's adapter cannot emit that event, the bind is skipped
		// with a warning rather than silently never firing.
		await this.webhooks.bind(handler, { client: "personal" });
		await message.reply(`bound ${handler}`);
	}

	@Command({ name: "unbind", description: "Unbinds a webhook handler" })
	public async onUnbind(
		@Message() message: NestWhatsMessage,
		@Args() handler: string,
	) {
		await this.webhooks.unbind(handler, { client: "personal" });
		await message.reply(`unbound ${handler}`);
	}
}
