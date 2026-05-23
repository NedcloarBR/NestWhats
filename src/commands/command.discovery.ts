import { NestWhatsBaseDiscovery } from "../context";

export interface CommandMeta {
	name: string;
	description: string;
	aliases?: string[];
	prefix?: string;
}

export class CommandDiscovery extends NestWhatsBaseDiscovery<CommandMeta> {
	public getName() {
		return this.meta.name;
	}

	public getDescription() {
		return this.meta.description;
	}

	public getAliases() {
		return this.meta.aliases ?? [];
	}

	public getPrefix() {
		return this.meta.prefix;
	}

	public isCommand(): this is CommandDiscovery {
		return true;
	}

	public override toJSON(): Record<string, any> {
		return this.meta;
	}
}
