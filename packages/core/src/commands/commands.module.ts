import { Global, Module, OnModuleInit } from "@nestjs/common";
import { ExplorerService } from "../nestwhats-explorer.service";
import { CommandDiscovery } from "./command.discovery";
import { CommandsService } from "./commands.service";
import { Command } from "./decorators/command.decorator";

@Global()
@Module({
	providers: [CommandsService],
	exports: [CommandsService],
})
export class CommandsModule implements OnModuleInit {
	public constructor(
		private readonly explorerService: ExplorerService<CommandDiscovery>,
		private readonly commandsService: CommandsService,
	) {}

	public onModuleInit() {
		return this.explorerService
			.explore(Command.KEY)
			.forEach((command) => this.commandsService.add(command));
	}
}
