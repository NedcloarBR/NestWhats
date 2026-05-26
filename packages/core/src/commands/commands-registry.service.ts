import { Injectable, Logger } from "@nestjs/common";
import { CommandDiscovery } from "./command.discovery";

@Injectable()
export class CommandsRegistryService {
	private readonly logger = new Logger(CommandsRegistryService.name);
	public readonly cache = new Map<string, CommandDiscovery>();
	public readonly prefixCache = new Map<string, Map<string, CommandDiscovery>>();

	public add(command: CommandDiscovery) {
		const customPrefix = command.getPrefix();

		if (customPrefix !== undefined) {
			this.addToPrefixCache(customPrefix, command);
		} else {
			this.addToCache(command);
		}
	}

	private addToCache(command: CommandDiscovery) {
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

	private addToPrefixCache(prefix: string, command: CommandDiscovery) {
		if (!this.prefixCache.has(prefix)) {
			this.prefixCache.set(prefix, new Map());
		}

		const map = this.prefixCache.get(prefix) as Map<string, CommandDiscovery>;
		const name = command.getName();

		if (map.has(name)) {
			this.logger.warn(`Command : ${name} with prefix "${prefix}" already exists`);
		}

		map.set(name, command);

		for (const alias of command.getAliases()) {
			if (map.has(alias)) {
				this.logger.warn(`Command alias: ${alias} with prefix "${prefix}" already exists`);
			}
			map.set(alias, command);
		}
	}

	public get(name: string) {
		return this.cache.get(name);
	}

	public getByPrefix(prefix: string, name: string) {
		return this.prefixCache.get(prefix)?.get(name);
	}

	public remove(name: string) {
		const command = this.cache.get(name);
		if (!command) return;
		this.cache.delete(name);
		for (const alias of command.getAliases()) {
			this.cache.delete(alias);
		}
	}

	public removeByPrefix(prefix: string, name: string) {
		const map = this.prefixCache.get(prefix);
		if (!map) return;

		const command = map.get(name);
		if (!command) return;

		map.delete(name);
		for (const alias of command.getAliases()) {
			map.delete(alias);
		}

		if (map.size === 0) {
			this.prefixCache.delete(prefix);
		}
	}
}
