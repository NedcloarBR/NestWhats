import { Module } from "@nestjs/common";
import {
	LocalAuth,
	WhatsAppWebJsAdapterFactory,
} from "@nestwhats/platform-whatsapp-web.js";
import { NestWhatsClientConfig, NestWhatsModule } from "nestwhats";
import { ConnectionListener } from "./connection.listener.js";
import { MessageListener } from "./message.listener.js";

@Module({
	imports: [
		NestWhatsModule.forRoot({
			adapters: [
				new WhatsAppWebJsAdapterFactory({ authStrategy: new LocalAuth() }),
			],
			clients: [
				new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, {
					name: "personal",
				}),
			],
			// Hold a `disconnected` announcement: a reconnect inside the window
			// cancels it, so a brief flap does not reach handlers at all.
			disconnectDebounceMs: 30_000,
			// Reconnect after a drop, backing off by reason. Off by default.
			reconnect: {},
		}),
	],
	providers: [ConnectionListener, MessageListener],
})
export class AppModule {}
