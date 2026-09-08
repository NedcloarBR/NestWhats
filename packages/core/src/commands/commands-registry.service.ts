import { Injectable, Logger } from "@nestjs/common";
import { CommandDiscovery } from "./command.discovery.js";
import { SubcommandDiscovery } from "./subcommand.discovery.js";

/** Every command and subcommand found in the application. */
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
		const name = command.getName().toLowerCase();

		if (this.cache.has(name)) {
			this.logger.warn(`Command : ${name} already exists`);
		}

		this.cache.set(name, command);

		for (const rawAlias of command.getAliases()) {
			const alias = rawAlias.toLowerCase();
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
		const name = command.getName().toLowerCase();

		if (map.has(name)) {
			this.logger.warn(
				`Command : ${name} with prefix "${prefix}" already exists`,
			);
		}

		map.set(name, command);

		for (const rawAlias of command.getAliases()) {
			const alias = rawAlias.toLowerCase();
			if (map.has(alias)) {
				this.logger.warn(
					`Command alias: ${alias} with prefix "${prefix}" already exists`,
				);
			}
			map.set(alias, command);
		}
	}

	public addSubcommand(sub: SubcommandDiscovery) {
		const parent = sub.getParent().toLowerCase();
		if (!this.subcommandCache.has(parent)) {
			this.subcommandCache.set(parent, new Map());
		}
		const map = this.subcommandCache.get(parent) as Map<
			string,
			SubcommandDiscovery
		>;
		const name = sub.getName().toLowerCase();

		if (map.has(name)) {
			this.logger.warn(`Subcommand "${name}" of "${parent}" already exists`);
		}
		map.set(name, sub);

		for (const rawAlias of sub.getAliases()) {
			const alias = rawAlias.toLowerCase();
			if (map.has(alias)) {
				this.logger.warn(
					`Subcommand alias "${alias}" of "${parent}" already exists`,
				);
			}
			map.set(alias, sub);
		}
	}

	public getSub(parent: string, name: string): SubcommandDiscovery | undefined {
		return this.subcommandCache
			.get(parent.toLowerCase())
			?.get(name.toLowerCase());
	}

	public getAll(): CommandDiscovery[] {
		const seen = new Set<CommandDiscovery>();
		for (const command of this.cache.values()) seen.add(command);
		for (const map of this.prefixCache.values())
			for (const command of map.values()) seen.add(command);
		return [...seen];
	}

	public get(name: string) {
		return this.cache.get(name.toLowerCase());
	}

	public getByPrefix(prefix: string, name: string) {
		return this.prefixCache.get(prefix)?.get(name.toLowerCase());
	}

	public remove(name: string) {
		const key = name.toLowerCase();
		const command = this.cache.get(key);
		if (!command) return;
		this.cache.delete(key);
		for (const alias of command.getAliases()) {
			this.cache.delete(alias.toLowerCase());
		}
	}

	public removeByPrefix(prefix: string, name: string) {
		const map = this.prefixCache.get(prefix);
		if (!map) return;

		const key = name.toLowerCase();
		const command = map.get(key);
		if (!command) return;

		map.delete(key);
		for (const alias of command.getAliases()) {
			map.delete(alias.toLowerCase());
		}

		if (map.size === 0) {
			this.prefixCache.delete(prefix);
		}
	}
}
