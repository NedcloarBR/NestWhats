import { Module } from "@nestjs/common";
import { BaileysAdapterFactory } from "@nestwhats/platform-baileys";
import {
	LocalAuth,
	WhatsAppWebJsAdapterFactory,
} from "@nestwhats/platform-whatsapp-web.js";
import { NestWhatsClientConfig, NestWhatsModule } from "nestwhats";
import { RoutingHandler } from "./routing.handler.js";
import { RoutingService } from "./routing.service.js";
import { SupportHandler } from "./support.handler.js";

@Module({
	imports: [
		NestWhatsModule.forRoot({
			// Two platforms. Each client says which it runs on.
			adapters: [
				new WhatsAppWebJsAdapterFactory({ authStrategy: new LocalAuth() }),
				new BaileysAdapterFactory({ authDir: ".baileys_auth" }),
			],
			clients: [
				// Naming the factory class is what types this client's `options`
				// against the factory that receives them.
				new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, {
					name: "support",
					prefix: "!",
				}),
				new NestWhatsClientConfig(BaileysAdapterFactory, {
					name: "alerts",
					prefix: "/",
				}),
			],
		}),
	],
	providers: [SupportHandler, RoutingHandler, RoutingService],
})
export class AppModule {}
