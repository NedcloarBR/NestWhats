import { DynamicModule, Module, OnModuleInit } from "@nestjs/common";
import { ExplorerService } from "nestwhats";
import { WebhookEvent } from "./decorators/webhook-event.decorator";
import { WebhookEventDiscovery } from "./discovery/webhook-event.discovery";
import type {
	NestWhatsMessagingAsyncOptions,
	NestWhatsMessagingOptions,
} from "./messaging-options.interface";
import {
	MESSAGING_OPTIONS,
	WEBHOOK_SERVICE_TOKEN,
} from "./messaging.constants";
import { NestWhatsMessagingService } from "./services/nestwhats-messaging.service";
import { NestWhatsWebhookService } from "./services/nestwhats-webhook.service";
import { WebhookEventRegistryService } from "./services/webhook-event-registry.service";
import { JsonFileWebhookStorage } from "./storage";

const SHARED_PROVIDERS = [
	NestWhatsMessagingService,
	NestWhatsWebhookService,
	WebhookEventRegistryService,
	{ provide: WEBHOOK_SERVICE_TOKEN, useExisting: NestWhatsWebhookService },
];

const SHARED_EXPORTS = [
	NestWhatsMessagingService,
	NestWhatsWebhookService,
	WEBHOOK_SERVICE_TOKEN,
];

@Module({
	providers: SHARED_PROVIDERS,
	exports: SHARED_EXPORTS,
})
export class NestWhatsMessagingModule implements OnModuleInit {
	constructor(
		private readonly explorerService: ExplorerService<WebhookEventDiscovery>,
		private readonly webhookEventRegistry: WebhookEventRegistryService,
	) {}

	public static forRoot(
		options: NestWhatsMessagingOptions = {},
	): DynamicModule {
		const resolved: NestWhatsMessagingOptions = {
			storage: new JsonFileWebhookStorage(),
			...options,
		};
		return {
			module: NestWhatsMessagingModule,
			providers: [
				{ provide: MESSAGING_OPTIONS, useValue: resolved },
				...SHARED_PROVIDERS,
			],
			exports: SHARED_EXPORTS,
		};
	}

	public static forRootAsync(
		options: NestWhatsMessagingAsyncOptions,
	): DynamicModule {
		return {
			module: NestWhatsMessagingModule,
			imports: options.imports ?? [],
			providers: [
				{
					provide: MESSAGING_OPTIONS,
					useFactory: options.useFactory,
					inject: options.inject ?? [],
				},
				...SHARED_PROVIDERS,
			],
			exports: SHARED_EXPORTS,
		};
	}

	public onModuleInit(): void {
		const handlers = this.explorerService.explore(WebhookEvent.KEY);
		this.webhookEventRegistry.set(handlers);
	}
}
