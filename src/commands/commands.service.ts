import { Injectable, Logger } from "@nestjs/common";
import { CommandDiscovery } from "./command.discovery";

@Injectable()
export class CommandsService {
	private readonly logger = new Logger(CommandsService.name);

	public readonly cache = new Map<string, CommandDiscovery>();

	public add(command: CommandDiscovery) {
		const name = command.getName();

		if (this.cache.has(name)) {
			this.logger.warn(`Command : ${name} already exists`);
		}

		this.cache.set(name, command);

		for (const alias of command.getAliases()) {
			if (this.cache.has(alias)) {
				this.logger.warn(`Command alias: ${alias} already exists`);
			}
			this.cache.set(alias, command);
		}
	}

	public get(name: string) {
		return this.cache.get(name);
	}

	public remove(name: string) {
		const command = this.cache.get(name);
		if (!command) return;
		this.cache.delete(name);
		for (const alias of command.getAliases()) {
			this.cache.delete(alias);
		}
	}
}
