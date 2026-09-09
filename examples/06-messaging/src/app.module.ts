import { Module } from "@nestjs/common";
import {
	LocalAuth,
	WhatsAppWebJsAdapterFactory,
} from "@nestwhats/platform-whatsapp-web.js";
import { NestWhatsClientConfig, NestWhatsModule } from "nestwhats";
import { InvoiceHandler } from "./invoice.handler.js";
import { NotifierService } from "./notifier.service.js";

@Module({
	imports: [
		NestWhatsModule.forRoot({
			adapters: [
				new WhatsAppWebJsAdapterFactory({ authStrategy: new LocalAuth() }),
			],
			clients: [
				new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, {
					name: "alerts",
					prefix: "!",
				}),
			],
		}),
	],
	providers: [NotifierService, InvoiceHandler],
})
export class AppModule {}
