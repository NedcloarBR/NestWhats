import { Module } from "@nestjs/common";
import {
	LocalAuth,
	WhatsAppWebJsAdapterFactory,
} from "@nestwhats/platform-whatsapp-web.js";
import { NestWhatsClientConfig, NestWhatsModule } from "nestwhats";
import { AppHandler } from "./app.handler.js";

@Module({
	imports: [
		NestWhatsModule.forRoot({
			// `adapters` takes the factory that builds one adapter per client,
			// holding the configuration they share.
			adapters: [
				new WhatsAppWebJsAdapterFactory({
					authStrategy: new LocalAuth(),
				}),
			],
			// `clients` names the connections to start. One here; see 05.
			clients: [
				new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, {
					name: "personal",
					prefix: "!",
				}),
			],
		}),
	],
	providers: [AppHandler],
})
export class AppModule {}
