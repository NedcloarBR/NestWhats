import { Injectable, InjectionToken, Logger } from "@nestjs/common";
import { Client } from "whatsapp-web.js";
import { getClientToken } from "./providers/client-token.util";

export interface ClientEntry {
	name: string;
	client: Client;
	prefix: string;
}

@Injectable()
export class ClientsRegistryService {
	private readonly logger = new Logger(ClientsRegistryService.name);
	private readonly registry = new Map<InjectionToken, ClientEntry>();

	public add(entry: ClientEntry): void {
		const token = getClientToken(entry.name);

		if (this.registry.has(token)) {
			this.logger.warn(`Client "${entry.name}" is already registered and will be overwritten`);
		}

		this.registry.set(token, entry);
	}

	public get(name?: string): Client | undefined {
		return this.registry.get(getClientToken(name))?.client;
	}

	public getEntry(name?: string): ClientEntry | undefined {
		return this.registry.get(getClientToken(name));
	}

	public getAll(): ClientEntry[] {
		return [...this.registry.values()];
	}

	public getNames(): string[] {
		return [...this.registry.values()].map((entry) => entry.name);
	}
}
