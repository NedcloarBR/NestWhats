import {
	Global,
	Inject,
	Module,
	OnApplicationBootstrap,
	OnModuleInit,
} from "@nestjs/common";
import { Client, Events } from "whatsapp-web.js";
import { ExplorerService } from "../nestwhats-explorer.service";
import { NestWhatsModuleOptions } from "../nestwhats-options.interface";
import { NESTWHATS_MODULE_OPTIONS } from "../nestwhats.module-definition";
import { CommandDiscovery } from "./command.discovery";
import { CommandsService } from "./commands.service";
import { Command } from "./decorators/command.decorator";

@Global()
@Module({
	providers: [CommandsService],
	exports: [CommandsService],
})
export class CommandsModule implements OnModuleInit, OnApplicationBootstrap {
	public constructor(
		@Inject(NESTWHATS_MODULE_OPTIONS)
		private readonly options: NestWhatsModuleOptions,
		private readonly client: Client,
		private readonly explorerService: ExplorerService<CommandDiscovery>,
		private readonly commandsService: CommandsService,
	) {}

	public onModuleInit() {
		return this.explorerService
			.explore(Command.KEY)
			.forEach((command) => this.commandsService.add(command));
	}

	public onApplicationBootstrap() {
		return this.client.on(Events.MESSAGE_CREATE, async (message) => {
			if (!message?.body?.length) return;

			const content = message.body.toLowerCase();
			const globalPrefix = this.options.prefix ?? "!";

			if (globalPrefix && content.startsWith(globalPrefix)) {
				const args = content.substring(globalPrefix.length).split(/ +/g);
				const cmd = args.shift();

				if (cmd) {
					const command = this.commandsService.get(cmd);
					if (command) return command.execute([message]);
				}
			}

			for (const [prefix, commands] of this.commandsService.prefixCache) {
				if (content.startsWith(prefix)) {
					const args = content.substring(prefix.length).split(/ +/g);
					const cmd = args.shift();

					if (cmd) {
						const command = commands.get(cmd);
						if (command) return command.execute([message]);
					}
				}
			}
		});
	}
}
