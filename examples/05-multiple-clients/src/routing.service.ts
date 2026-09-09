import { Injectable, Logger } from "@nestjs/common";
import {
	InjectClient,
	NestWhatsClient,
	NestWhatsMessagingService,
} from "nestwhats";

/**
 * Two ways to send, with the same methods on both.
 *
 * The injected client is for when you know which one at build time; the
 * service is for when the client is chosen at runtime — including virtual
 * clients, which have no injection token because they did not exist at boot.
 */
@Injectable()
export class RoutingService {
	private readonly logger = new Logger(RoutingService.name);

	public constructor(
		@InjectClient("alerts") private readonly alerts: NestWhatsClient,
		private readonly messaging: NestWhatsMessagingService,
	) {}

	public async alert(chatId: string, text: string) {
		await this.alerts.sendMessage(chatId, text);
	}

	public async sendAs(clientName: string, chatId: string, text: string) {
		await this.messaging.sendMessage(chatId, text, { client: clientName });
	}

	/** Every client knows its own platform before it even connects. */
	public describe(): string {
		const description = `${this.alerts.name} runs on ${this.alerts.platform?.id}`;
		this.logger.log(description);
		return description;
	}
}
