import { Reflector } from "@nestjs/core";
import { NestWhatsEvents } from "nestwhats";
import {
	WebhookEventDiscovery,
	WebhookEventMeta,
} from "../discovery/webhook-event.discovery";

const WebhookEventDecorator = Reflector.createDecorator<
	WebhookEventMeta,
	WebhookEventDiscovery
>({
	transform: (options) => new WebhookEventDiscovery(options),
});

export const WebhookEvent = {
	KEY: WebhookEventDecorator.KEY,

	On: <K extends keyof E, E = NestWhatsEvents>(
		event: K,
		options?: { client?: string | string[] },
	) =>
		WebhookEventDecorator({
			type: "on",
			event: event as string,
			client: options?.client,
		}),

	Once: <K extends keyof E, E = NestWhatsEvents>(
		event: K,
		options?: { client?: string | string[] },
	) =>
		WebhookEventDecorator({
			type: "once",
			event: event as string,
			client: options?.client,
		}),
};
