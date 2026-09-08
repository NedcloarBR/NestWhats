import { Module } from "@nestjs/common";
import { WhatsAppWebJsMessagingService } from "./messaging.service.js";

/**
 * Provides {@link WhatsAppWebJsMessagingService}. Import it only if you need
 * the whatsapp-web.js escape hatch — media, presence, read receipts and revokes
 * are portable and already available on the core's messaging service.
 */
@Module({
	providers: [WhatsAppWebJsMessagingService],
	exports: [WhatsAppWebJsMessagingService],
})
export class WhatsAppWebJsMessagingModule {}
