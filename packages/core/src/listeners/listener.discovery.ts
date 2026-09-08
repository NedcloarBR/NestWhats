import { NestWhatsBaseDiscovery } from "../context/index.js";

/** What `@On` and `@Once` record about a handler. */
export interface ListenerMeta {
	/** `on` for every occurrence, `once` for the first only. */
	type: "once" | "on";
	/** The event name to bind to. */
	event: string | symbol | number;
	/** Restricts the handler to one or more named clients. */
	client?: string | string[];
}

/** A discovered listener, with the metadata it was declared with. */
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
