import { NestWhatsBaseDiscovery } from "../context";

export interface ListenerMeta {
	type: "once" | "on";
	event: string | symbol | number;
	client?: string | string[];
}
export class ListenerDiscovery extends NestWhatsBaseDiscovery<ListenerMeta> {
	public getType() {
		return this.meta.type;
	}

	public getEvent() {
		return this.meta.event.toString();
	}

	public getClients(): string[] | undefined {
		const { client } = this.meta;
		if (!client) return undefined;
		return Array.isArray(client) ? client : [client];
	}

	public isListener(): this is ListenerDiscovery {
		return true;
	}

	public override toJSON(): Record<string, any> {
		return this.meta;
	}
}
