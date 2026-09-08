import { Global, Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { NestWhatsClientManagerService } from "../client/client-manager.service.js";
import { ClientsRegistryService } from "../client/clients-registry.service.js";
import { CommandsModule } from "../commands/commands.module.js";
import { ListenersModule } from "../listeners/listeners.module.js";
import { ExplorerService } from "../services/explorer.service.js";
import { NestWhatsHealthIndicator } from "../services/health.indicator.js";
import { NestWhatsMessagingService } from "../services/messaging.service.js";
import { CLIENT_MANAGER_TOKEN } from "./constants.js";

/** Providers shared by every client: registries, dispatch and messaging. */
@Global()
@Module({
	imports: [DiscoveryModule, CommandsModule, ListenersModule],
	providers: [
		ExplorerService,
		ClientsRegistryService,
		NestWhatsHealthIndicator,
		NestWhatsClientManagerService,
		NestWhatsMessagingService,
		{
			provide: CLIENT_MANAGER_TOKEN,
			useExisting: NestWhatsClientManagerService,
		},
	],
	exports: [
		CommandsModule,
		ListenersModule,
		ExplorerService,
		ClientsRegistryService,
		NestWhatsHealthIndicator,
		NestWhatsClientManagerService,
		NestWhatsMessagingService,
		CLIENT_MANAGER_TOKEN,
	],
})
export class NestWhatsSharedModule {}
