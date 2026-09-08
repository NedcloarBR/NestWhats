import {
	Global,
	Logger,
	Module,
	OnApplicationBootstrap,
	OnModuleInit,
} from "@nestjs/common";
import { ClientsRegistryService } from "../client/clients-registry.service.js";
import { ExplorerService } from "../services/explorer.service.js";
import { Listener } from "./decorators/index.js";
import { NESTWHATS_MANAGED_LISTENER } from "./listener.constants.js";
import { ListenerDiscovery } from "./listener.discovery.js";
import { ListenerRegistryService } from "./listener-registry.service.js";

/** Wires listener discovery. Imported by `NestWhatsModule`. */
@Global()
@Module({
	providers: [ListenerRegistryService],
	exports: [ListenerRegistryService],
})
export class ListenersModule implements OnModuleInit, OnApplicationBootstrap {
	private readonly logger = new Logger("NestWhats");

	public constructor(
		private readonly explorerService: ExplorerService<ListenerDiscovery>,
		private readonly listenerRegistry: ListenerRegistryService,
		private readonly clientsRegistry: ClientsRegistryService,
	) {}

	public onModuleInit() {
		const listeners = this.explorerService.explore(Listener.KEY);
		this.listenerRegistry.set(listeners);
	}

	public onApplicationBootstrap() {
		const known = new Set(this.clientsRegistry.getAll().map((e) => e.name));

		for (const listener of this.listenerRegistry.getAll()) {
			const handler = listener.getHandler();
			if (handler && Reflect.getMetadata(NESTWHATS_MANAGED_LISTENER, handler))
				continue;

			for (const clientName of listener.getClients() ?? []) {
				if (known.has(clientName)) continue;
				const key = `${listener.getClass()?.name ?? "Unknown"}.${handler?.name ?? "unknown"}`;
				this.logger.warn(
					`Listener "${key}" targets client "${clientName}" which is not registered — it will only fire if a client named "${clientName}" is created at runtime`,
				);
			}
		}
	}
}
