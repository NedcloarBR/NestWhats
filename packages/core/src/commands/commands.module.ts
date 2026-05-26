import { Global, Module, OnModuleInit } from "@nestjs/common";
import { ExplorerService } from "../nestwhats-explorer.service";
import { CommandDiscovery } from "./command.discovery";
import { Command } from "./decorators/command.decorator";
import { CommandsRegistryService } from "./commands-registry.service";
import { CommandsService } from "./commands.service";

@Global()
@Module({
	providers: [CommandsRegistryService, CommandsService],
	exports: [CommandsRegistryService, CommandsService],
})
export class CommandsModule implements OnModuleInit {
	public constructor(
		private readonly explorerService: ExplorerService<CommandDiscovery>,
		private readonly registry: CommandsRegistryService,
	) {}

	public onModuleInit() {
		return this.explorerService
			.explore(Command.KEY)
			.forEach((command) => this.registry.add(command));
	}
}
