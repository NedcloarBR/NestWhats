import { Global, Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { ClientsRegistryService } from "./clients-registry.service";
import { CommandsModule } from "./commands/commands.module";
import { ListenersModule } from "./listeners/listeners.module";
import { ExplorerService } from "./nestwhats-explorer.service";

@Global()
@Module({
	imports: [DiscoveryModule, CommandsModule, ListenersModule],
	providers: [ExplorerService, ClientsRegistryService],
	exports: [
		CommandsModule,
		ListenersModule,
		ExplorerService,
		ClientsRegistryService,
	],
})
export class NestWhatsSharedModule {}
