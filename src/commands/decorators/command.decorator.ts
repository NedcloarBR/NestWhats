import { Reflector } from "@nestjs/core";
import { CommandDiscovery, CommandMeta } from "../command.discovery";

export const Command = Reflector.createDecorator<CommandMeta, CommandDiscovery>(
	{
		transform: (options: CommandMeta) => new CommandDiscovery(options),
	},
);
