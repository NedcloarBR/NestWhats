import { Injectable } from "@nestjs/common";
import { ListenerDiscovery, ListenerRegistryService } from "nestwhats";
import { WEBHOOK_HANDLER_METADATA } from "../decorators/webhook.decorator.js";

/**
 * The `@Webhook()` handlers discovered in the application — the set that can be
 * bound at runtime, as opposed to the listeners the core binds itself.
 */
@Injectable()
export class WebhookEventRegistryService {
	public constructor(
		private readonly listenerRegistry: ListenerRegistryService,
	) {}

	public getAll(): ListenerDiscovery[] {
		return this.listenerRegistry.getAll().filter((discovery) => {
			const handler = discovery.getHandler();
			return (
				handler !== undefined &&
				Reflect.getMetadata(WEBHOOK_HANDLER_METADATA, handler) !== undefined
			);
		});
	}
}
