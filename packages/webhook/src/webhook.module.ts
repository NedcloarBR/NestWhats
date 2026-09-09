import { DynamicModule, Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { NestWhatsWebhookService } from "./services/webhook.service.js";
import { WebhookEventRegistryService } from "./services/webhook-event-registry.service.js";
import { JsonFileWebhookStorage } from "./storage/index.js";
import { WEBHOOK_OPTIONS, WEBHOOK_SERVICE_TOKEN } from "./webhook.constants.js";
import type {
	NestWhatsWebhookAsyncOptions,
	NestWhatsWebhookOptions,
} from "./webhook-options.interface.js";

const SHARED_PROVIDERS = [
	NestWhatsWebhookService,
	WebhookEventRegistryService,
	{ provide: WEBHOOK_SERVICE_TOKEN, useExisting: NestWhatsWebhookService },
];

const SHARED_EXPORTS = [NestWhatsWebhookService, WEBHOOK_SERVICE_TOKEN];

/**
 * Runtime binding of `@Webhook()` handlers.
 *
 * ```typescript
 * NestWhatsWebhookModule.forRoot({ storage: new JsonFileWebhookStorage() })
 * ```
 */
@Module({
	imports: [DiscoveryModule],
	providers: SHARED_PROVIDERS,
	exports: SHARED_EXPORTS,
})
// biome-ignore lint/complexity/noStaticOnlyClass: forRoot pattern matches NestWhatsModule convention
export class NestWhatsWebhookModule {
	public static forRoot(options: NestWhatsWebhookOptions = {}): DynamicModule {
		const resolved: NestWhatsWebhookOptions = {
			storage: new JsonFileWebhookStorage(),
			...options,
		};
		return {
			module: NestWhatsWebhookModule,
			providers: [
				{ provide: WEBHOOK_OPTIONS, useValue: resolved },
				...SHARED_PROVIDERS,
			],
			exports: SHARED_EXPORTS,
		};
	}

	public static forRootAsync(
		options: NestWhatsWebhookAsyncOptions,
	): DynamicModule {
		return {
			module: NestWhatsWebhookModule,
			imports: options.imports ?? [],
			providers: [
				{
					provide: WEBHOOK_OPTIONS,
					useFactory: options.useFactory,
					inject: options.inject ?? [],
				},
				...SHARED_PROVIDERS,
			],
			exports: SHARED_EXPORTS,
		};
	}
}
