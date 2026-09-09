import { Injectable, Logger } from "@nestjs/common";
import { Webhook } from "@nestwhats/webhook";
import { Context, ContextOf, On } from "nestwhats";

@Injectable()
export class ForwardHandler {
	private readonly logger = new Logger(ForwardHandler.name);

	/**
	 * `@Webhook()` excludes this from automatic binding: it fires only after
	 * being bound, per client. That is the point — which number forwards which
	 * event becomes a runtime decision instead of a redeploy.
	 *
	 * Forwarding the result somewhere is your code; the package is about the
	 * binding.
	 */
	@On("messageUpsert")
	@Webhook()
	public async onMessage(
		@Context() [client, message]: ContextOf<"messageUpsert">,
	) {
		if (message.fromMe) return;

		await fetch("https://example.invalid/hook", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				client: client.name,
				from: message.senderId,
				body: message.body,
			}),
		}).catch((err) => this.logger.warn(`forward failed: ${err}`));
	}

	@On("disconnected")
	@Webhook()
	public async onDisconnected(@Context() [client]: ContextOf<"disconnected">) {
		this.logger.warn(`would page someone about ${client.name}`);
	}
}
