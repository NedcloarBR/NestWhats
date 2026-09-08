import { Module } from "@nestjs/common";
import { BaileysMessagingService } from "./messaging.service.js";

/**
 * Provides {@link BaileysMessagingService}. Import it only if you need the
 * Baileys escape hatch — media, presence, read receipts, revokes and the
 * social capabilities are portable and already available on the core's
 * messaging service.
 */
@Module({
	providers: [BaileysMessagingService],
	exports: [BaileysMessagingService],
})
export class BaileysMessagingModule {}
