import { NestWhatsBaseDiscovery } from "../context/index.js";

/** What `@Command()` takes. */
export interface CommandMeta {
	/** The word that triggers it, after the prefix. */
	name: string;
	/** Shown by a help command, and in the dashboard. */
	description: string;
	/** Other words that trigger the same handler. */
	aliases?: string[];
	/** Overrides the client's prefix for this command alone. */
	prefix?: string;
	/** Restricts it to one or more named clients. */
	client?: string | string[];
}

/** A discovered `@Command()` handler, with the metadata it was declared with. */
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

	public getClients(): string[] | undefined {
		const { client } = this.meta;
		if (!client) return undefined;
		return Array.isArray(client) ? client : [client];
	}

	public isCommand(): this is CommandDiscovery {
		return true;
	}

	public override toJSON(): Record<string, any> {
		return this.meta;
	}
}
