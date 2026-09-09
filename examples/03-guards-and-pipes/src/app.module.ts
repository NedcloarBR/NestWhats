import { Module } from "@nestjs/common";
import {
	LocalAuth,
	WhatsAppWebJsAdapterFactory,
} from "@nestwhats/platform-whatsapp-web.js";
import { NestWhatsClientConfig, NestWhatsModule } from "nestwhats";
import { BusinessHoursGuard } from "./business-hours.guard.js";
import { ModerationHandler } from "./moderation.handler.js";

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
	],
	providers: [ModerationHandler, BusinessHoursGuard],
})
export class AppModule {}
