import { Injectable } from "@nestjs/common";
import { ClientStatus, ClientsRegistryService } from "./clients-registry.service";
import { CommandsRegistryService } from "./commands/commands-registry.service";
import { ListenerRegistryService } from "./listeners/listener-registry.service";

export interface NestWhatsClientDetail {
	status: ClientStatus;
	since: number;
}

export interface NestWhatsClientHealth {
	status: "up" | "down";
	commands: number;
	listeners: number;
	breakdown: Record<ClientStatus, number>;
	clients: Record<string, NestWhatsClientDetail>;
}

@Injectable()
export class NestWhatsHealthIndicator {
	public constructor(
		private readonly clientsRegistry: ClientsRegistryService,
		private readonly commandsRegistry: CommandsRegistryService,
		private readonly listenerRegistry: ListenerRegistryService,
	) {}

	public isHealthy(key = "whatsapp"): Record<string, NestWhatsClientHealth> {
		const entries = this.clientsRegistry.getAll();
		const now = Date.now();

		const breakdown = Object.fromEntries(
			Object.values(ClientStatus).map((s) => [s, 0]),
		) as Record<ClientStatus, number>;
		for (const e of entries) breakdown[e.status]++;

		const clients = Object.fromEntries(
			entries.map((e) => [
				e.name,
				{ status: e.status, since: Math.floor((now - e.statusAt) / 1000) },
			]),
		);

		const up = entries.every(
			(e) =>
				e.status === ClientStatus.Ready ||
				e.status === ClientStatus.Authenticated,
		);

		return {
			[key]: {
				status: up ? "up" : "down",
				commands: this.commandsRegistry.getAll().length,
				listeners: this.listenerRegistry.getAll().length,
				breakdown,
				clients,
			},
		};
	}
}
