import { Injectable } from "@nestjs/common";
import { Message } from "whatsapp-web.js";
import { CommandsRegistryService } from "./commands-registry.service";

@Injectable()
export class CommandsService {
	public constructor(private readonly registry: CommandsRegistryService) {}

	public async handle(message: Message, clientName: string, prefix: string): Promise<void> {
		if (!message?.body?.length) return;

		const content = message.body.toLowerCase();

		if (prefix && content.startsWith(prefix)) {
			const args = content.substring(prefix.length).split(/ +/g);
			const cmd = args.shift();

			if (cmd) {
				const command = this.registry.get(cmd);
				if (command) {
					const clients = command.getClients();
					if (!clients || clients.includes(clientName)) {
						await command.execute([message]);
						return;
					}
				}
			}
		}

		for (const [customPrefix, commands] of this.registry.prefixCache) {
			if (content.startsWith(customPrefix)) {
				const args = content.substring(customPrefix.length).split(/ +/g);
				const cmd = args.shift();

				if (cmd) {
					const command = commands.get(cmd);
					if (command) {
						const clients = command.getClients();
						if (!clients || clients.includes(clientName)) {
							await command.execute([message]);
							return;
						}
					}
				}
			}
		}
	}
}
