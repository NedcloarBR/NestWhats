import { NestWhatsBaseDiscovery, NestWhatsEvents } from "nestwhats";

export interface WebhookEventMeta {
	type: "on" | "once";
	event: keyof NestWhatsEvents | string;
	client?: string | string[];
}

export class WebhookEventDiscovery extends NestWhatsBaseDiscovery<WebhookEventMeta> {
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

	public getKey(): string {
		const className = this.getClass()?.name ?? "Unknown";
		const methodName = this.getHandler()?.name ?? "unknown";
		return `${className}.${methodName}`;
	}

	public override toJSON(): Record<string, unknown> {
		return { key: this.getKey(), ...this.meta };
	}
}
