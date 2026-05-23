import { Global, Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { CommandsModule } from "./commands/commands.module";
import { ListenersModule } from "./listeners/listeners.module";
import { ExplorerService } from "./nestwhats-explorer.service";
import { ClientsRegistryService } from "./providers/clients-registry.service";

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
