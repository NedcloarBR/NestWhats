import { Reflector } from "@nestjs/core";
import { CommandDiscovery, CommandMeta } from "../command.discovery.js";

/**
 * Declares a command handler.
 *
 * ```typescript
 * @Command({ name: 'ping', description: 'Answers pong' })
 * async onPing(@Message() message: NestWhatsMessage) {
 *   await message.reply('pong');
 * }
 * ```
 */
export const Command = Reflector.createDecorator<CommandMeta, CommandDiscovery>(
	{
		transform: (options: CommandMeta) => new CommandDiscovery(options),
	},
);
