import { Module } from "@nestjs/common";
import { BaileysAdapterFactory } from "@nestwhats/platform-baileys";
import { NestWhatsClientConfig, NestWhatsModule } from "nestwhats";
import { BaileysHandler } from "./baileys.handler.js";
import { ChatsHandler } from "./chats.handler.js";

@Module({
	imports: [
		NestWhatsModule.forRoot({
			adapters: [
				new BaileysAdapterFactory({
					authDir: ".baileys_auth",
					// Baileys keeps nothing between restarts and asks the application
					// for what it needs back. These three caches answer that.
					chatStore: true,
					groupCache: true,
					messageCacheMax: 2000,
					// Off keeps the phone receiving push notifications while the bot is
					// connected — WhatsApp treats an online client as the active one.
					markOnlineOnConnect: false,
				}),
			],
			clients: [
				new NestWhatsClientConfig(BaileysAdapterFactory, {
					name: "personal",
					prefix: "!",
				}),
			],
			// Baileys does not reconnect by itself, and even a successful pairing
			// ends in a `restartRequired` close.
			reconnect: {},
			disconnectDebounceMs: 30_000,
		}),
	],
	providers: [BaileysHandler, ChatsHandler],
})
export class AppModule {}
