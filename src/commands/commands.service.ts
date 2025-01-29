import { Injectable, Logger } from "@nestjs/common";
import { CommandDiscovery } from "./command.discovery";

@Injectable()
export class CommandsService {
	private readonly logger = new Logger(CommandsService.name);

	public readonly cache = new Map<string, CommandDiscovery>();

	public add(Command: CommandDiscovery) {
		const name = Command.getName();

		if (this.cache.has(name)) {
			this.logger.warn(`Command : ${name} already exists`);
		}

		this.cache.set(name, Command);
	}

	public get(name: string) {
		return this.cache.get(name);
	}

	public remove(name: string) {
		this.cache.delete(name);
	}
}
