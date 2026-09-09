import { Module } from "@nestjs/common";
import {
	LocalAuth,
	WhatsAppWebJsAdapterFactory,
} from "@nestwhats/platform-whatsapp-web.js";
import {
	JsonFileWebhookStorage,
	NestWhatsWebhookModule,
} from "@nestwhats/webhook";
import { NestWhatsClientConfig, NestWhatsModule } from "nestwhats";
import { BindingHandler } from "./binding.handler.js";
import { ForwardHandler } from "./forward.handler.js";

@Module({
	imports: [
		NestWhatsModule.forRoot({
			adapters: [
				new WhatsAppWebJsAdapterFactory({ authStrategy: new LocalAuth() }),
			],
			clients: [
				new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, {
					name: "personal",
					prefix: "!",
				}),
			],
		}),
		// Without `forRoot` the module still works, but bindings are lost on a
		// restart. Only the bindings are stored — the clients belong to the core.
		NestWhatsWebhookModule.forRoot({
			storage: new JsonFileWebhookStorage(),
			logger: true,
		}),
	],
	providers: [ForwardHandler, BindingHandler],
})
export class AppModule {}
