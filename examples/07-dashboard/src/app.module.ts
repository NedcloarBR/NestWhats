import { Module } from "@nestjs/common";
import { NestWhatsDashboardModule } from "@nestwhats/dashboard";
import {
	LocalAuth,
	WhatsAppWebJsAdapterFactory,
} from "@nestwhats/platform-whatsapp-web.js";
import {
	JsonFileVirtualClientStorage,
	NestWhatsClientConfig,
	NestWhatsModule,
} from "nestwhats";
import { AdminHandler } from "./admin.handler.js";

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
			// Without this, clients created at runtime are gone on the next boot.
			// What is stored is the configuration to recreate them, never their
			// credentials — those belong to the adapter's auth strategy.
			storage: new JsonFileVirtualClientStorage(),
		}),
		NestWhatsDashboardModule.forRoot({
			port: 4000,
			path: "nestwhats",
			// No authentication by default, and the dashboard can create and
			// destroy clients. Set this on anything reachable beyond localhost.
			auth: { username: "admin", password: "change-me" },
		}),
	],
	providers: [AdminHandler],
})
export class AppModule {}
