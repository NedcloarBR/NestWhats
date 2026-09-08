import { Global, Module, OnModuleInit } from "@nestjs/common";
import { ExplorerService } from "../services/explorer.service.js";
import { CommandDiscovery } from "./command.discovery.js";
import { CommandsService } from "./commands.service.js";
import { CommandsRegistryService } from "./commands-registry.service.js";
import { Command } from "./decorators/command.decorator.js";
import { GroupDefault } from "./decorators/group-default.decorator.js";
import { Subcommand } from "./decorators/subcommand.decorator.js";

/** Wires command discovery and dispatch. Imported by `NestWhatsModule`. */
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
		for (const command of this.explorerService.explore(Command.KEY)) {
			this.registry.add(command);
		}

		const { commands, subcommands } = this.explorerService.exploreCommandGroups(
			Subcommand.KEY,
			GroupDefault.KEY,
		);
		for (const command of commands) {
			this.registry.add(command);
		}
		for (const subcommand of subcommands) {
			this.registry.addSubcommand(subcommand);
		}
	}
}
