import { NestWhatsBaseDiscovery } from "../context";

export interface SubcommandMeta {
	name: string;
	description: string;
	aliases?: string[];
	client?: string | string[];
}

export interface SubcommandInternalMeta extends SubcommandMeta {
	parent: string;
}

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

	public override toJSON(): Record<string, any> {
		return this.meta;
	}
}
