import { Injectable } from "@nestjs/common";
import { WebhookEventDiscovery } from "../discovery/webhook-event.discovery";

@Injectable()
export class WebhookEventRegistryService {
	private readonly handlers: WebhookEventDiscovery[] = [];

	public set(handlers: WebhookEventDiscovery[]): void {
		this.handlers.length = 0;
		this.handlers.push(...handlers);
	}

	public getAll(): WebhookEventDiscovery[] {
		return [...this.handlers];
	}
}
