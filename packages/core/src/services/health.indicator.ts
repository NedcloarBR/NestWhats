import { Injectable } from "@nestjs/common";
import type { NestWhatsAdapterInfo } from "../adapter/adapter.interface.js";
import { ClientStatus } from "../adapter/index.js";
import { ClientsRegistryService } from "../client/clients-registry.service.js";
import { CommandsRegistryService } from "../commands/commands-registry.service.js";
import { ListenerRegistryService } from "../listeners/listener-registry.service.js";

/** One client in a health report: state, how long it has been in it, and who it is. */
export interface NestWhatsClientDetail {
	status: ClientStatus;
	/** Seconds spent in the current status. */
	since: number;
	/** Who is connected, once the platform can say. */
	info?: NestWhatsAdapterInfo;
}

/** The health report: overall state, counts, and a breakdown per client. */
export interface NestWhatsClientHealth {
	/** `up` only when every client is authenticated or ready. */
	status: "up" | "down";
	/** Commands and subcommands discovered in the application. */
	commands: number;
	/** Listeners discovered in the application. */
	listeners: number;
	/** How many clients are in each status. */
	breakdown: Record<ClientStatus, number>;
	/** Per client, keyed by name. */
	clients: Record<string, NestWhatsClientDetail>;
}

/**
 * Reports client health in the shape `@nestjs/terminus` expects.
 *
 * `up` only when every client is authenticated or ready — one client waiting
 * for a QR takes the whole check down, which is usually what you want from a
 * readiness probe.
 */
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
				{
					status: e.status,
					since: Math.floor((now - e.statusAt) / 1000),
					info: e.info,
				},
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
