import { Global, Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { ClientsRegistryService } from "./clients-registry.service";
import { CommandsModule } from "./commands/commands.module";
import { ListenersModule } from "./listeners/listeners.module";
import { NestWhatsClientManagerService } from "./nestwhats-client-manager.service";
import { ExplorerService } from "./nestwhats-explorer.service";
import { NestWhatsHealthIndicator } from "./nestwhats-health.indicator";

const CLIENT_MANAGER_TOKEN = Symbol.for("NESTWHATS::CLIENT_MANAGER");

@Global()
@Module({
	imports: [DiscoveryModule, CommandsModule, ListenersModule],
	providers: [
		ExplorerService,
		ClientsRegistryService,
		NestWhatsHealthIndicator,
		NestWhatsClientManagerService,
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
		CLIENT_MANAGER_TOKEN,
	],
})
export class NestWhatsSharedModule {}
