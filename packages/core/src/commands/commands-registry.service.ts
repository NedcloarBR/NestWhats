import { Injectable, Logger } from "@nestjs/common";
import { CommandDiscovery } from "./command.discovery";
import { SubcommandDiscovery } from "./subcommand.discovery";

@Injectable()
export class CommandsRegistryService {
	private readonly logger = new Logger(CommandsRegistryService.name);
	public readonly cache = new Map<string, CommandDiscovery>();
	public readonly prefixCache = new Map<
		string,
		Map<string, CommandDiscovery>
	>();
	public readonly subcommandCache = new Map<
		string,
		Map<string, SubcommandDiscovery>
	>();

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
			this.logger.warn(
				`Command : ${name} with prefix "${prefix}" already exists`,
			);
		}

		map.set(name, command);

		for (const alias of command.getAliases()) {
			if (map.has(alias)) {
				this.logger.warn(
					`Command alias: ${alias} with prefix "${prefix}" already exists`,
				);
			}
			map.set(alias, command);
		}
	}

	public addSubcommand(sub: SubcommandDiscovery) {
		const parent = sub.getParent();
		if (!this.subcommandCache.has(parent)) {
			this.subcommandCache.set(parent, new Map());
		}
		const map = this.subcommandCache.get(parent) as Map<
			string,
			SubcommandDiscovery
		>;
		const name = sub.getName();

		if (map.has(name)) {
			this.logger.warn(`Subcommand "${name}" of "${parent}" already exists`);
		}
		map.set(name, sub);

		for (const alias of sub.getAliases()) {
			if (map.has(alias)) {
				this.logger.warn(
					`Subcommand alias "${alias}" of "${parent}" already exists`,
				);
			}
			map.set(alias, sub);
		}
	}

	public getSub(parent: string, name: string): SubcommandDiscovery | undefined {
		return this.subcommandCache.get(parent)?.get(name);
	}

	public getAll(): CommandDiscovery[] {
		const seen = new Set<CommandDiscovery>();
		for (const command of this.cache.values()) seen.add(command);
		for (const map of this.prefixCache.values())
			for (const command of map.values()) seen.add(command);
		return [...seen];
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
