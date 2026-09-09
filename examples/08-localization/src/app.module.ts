import { join } from "node:path";
import { Module } from "@nestjs/common";
import {
	JSONLocaleLoader,
	NestedLocaleAdapter,
	NestWhatsLocaleModule,
	PhoneCountryResolver,
} from "@nestwhats/locale";
import {
	LocalAuth,
	WhatsAppWebJsAdapterFactory,
} from "@nestwhats/platform-whatsapp-web.js";
import { NestWhatsClientConfig, NestWhatsModule } from "nestwhats";
import { GreetingHandler } from "./greeting.handler.js";

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
		NestWhatsLocaleModule.forRoot({
			adapter: new NestedLocaleAdapter({
				fallbackLocale: "en-US",
				locales: new JSONLocaleLoader({
					basePath: join(import.meta.dirname, "..", "locales"),
				}),
			}),
			// Resolvers decide, in order, which language a message gets. This one
			// reads the country code from the sender's number, so a +55 is answered
			// in Portuguese without anyone configuring anything.
			resolvers: [new PhoneCountryResolver()],
		}),
	],
	providers: [GreetingHandler],
})
export class AppModule {}
