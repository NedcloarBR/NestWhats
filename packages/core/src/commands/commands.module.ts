import { Global, Module, OnModuleInit } from "@nestjs/common";
import { ExplorerService } from "../nestwhats-explorer.service";
import { CommandDiscovery } from "./command.discovery";
import { CommandsRegistryService } from "./commands-registry.service";
import { CommandsService } from "./commands.service";
import { Command } from "./decorators/command.decorator";
import { GroupDefault } from "./decorators/group-default.decorator";
import { Subcommand } from "./decorators/subcommand.decorator";

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
		this.explorerService
			.explore(Command.KEY)
			.forEach((command) => this.registry.add(command));

		const { commands, subcommands } = this.explorerService.exploreCommandGroups(
			Subcommand.KEY,
			GroupDefault.KEY,
		);
		commands.forEach((cmd) => this.registry.add(cmd));
		subcommands.forEach((sub) => this.registry.addSubcommand(sub));
	}
}
