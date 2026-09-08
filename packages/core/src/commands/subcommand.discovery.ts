import { NestWhatsBaseDiscovery } from "../context/index.js";

/** What `@Subcommand()` takes; the parent comes from the enclosing group. */
export interface SubcommandMeta {
	/** The word after the group's name, as in `prefix` for `!config prefix`. */
	name: string;
	/** Shown by a help command. */
	description: string;
	/** Other words that reach the same handler. */
	aliases?: string[];
	/** Restricts it to one or more named clients. */
	client?: string | string[];
}

/** {@link SubcommandMeta} once the parent group's name has been resolved. */
export interface SubcommandInternalMeta extends SubcommandMeta {
	parent: string;
}

/** A discovered `@Subcommand()` handler. */
export class SubcommandDiscovery extends NestWhatsBaseDiscovery<SubcommandInternalMeta> {
	public getParent() {
		return this.meta.parent;
	}

	public getName() {
		return this.meta.name;
	}

	public getDescription() {
		return this.meta.description;
	}

	public getAliases() {
		return this.meta.aliases ?? [];
	}

	public getClients(): string[] | undefined {
		const { client } = this.meta;
		if (!client) return undefined;
		return Array.isArray(client) ? client : [client];
	}

	public override isSubcommand(): this is SubcommandDiscovery {
		return true;
	}

	public override toJSON(): Record<string, any> {
		return this.meta;
	}
}
