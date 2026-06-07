import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { Client, LocalAuth } from "whatsapp-web.js";
import { ClientsRegistryService } from "./clients-registry.service";
import { CommandsService } from "./commands/commands.service";
import { ListenerRegistryService } from "./listeners/listener-registry.service";
import { bindInternalEvents, bindListeners } from "./nestwhats-client.service";
import {
	NESTWHATS_GLOBAL_OPTIONS_TOKEN,
	NestWhatsGlobalOptions,
	VirtualClientOptions,
	resolveClientOptions,
	toClientOptions,
} from "./nestwhats-options.interface";

@Injectable()
export class NestWhatsClientManagerService {
	private readonly logger = new Logger(NestWhatsClientManagerService.name);

	public constructor(
		private readonly registry: ClientsRegistryService,
		private readonly listenerRegistry: ListenerRegistryService,
		private readonly commandsService: CommandsService,
		@Optional()
		@Inject(NESTWHATS_GLOBAL_OPTIONS_TOKEN)
		private readonly globalOptions?: NestWhatsGlobalOptions,
	) {}

	public async createClient(options: VirtualClientOptions): Promise<void> {
		if (this.registry.getEntry(options.name)) {
			this.logger.warn(
				`Client "${options.name}" is already registered — skipping`,
			);
			return;
		}

		const resolved = resolveClientOptions({
			authStrategy: new LocalAuth({ clientId: options.name }),
			prefix: this.globalOptions?.prefix,
			printQR: this.globalOptions?.printQR,
			authTimeoutMs: 0,
			...options,
		});

		const client = new Client(toClientOptions(resolved));

		bindInternalEvents(client, resolved.name, resolved, this.registry);
		this.registry.add({
			name: resolved.name,
			client,
			prefix: resolved.prefix,
			virtual: true,
		});
		bindListeners(
			client,
			resolved.name,
			resolved.prefix,
			this.listenerRegistry,
			this.commandsService,
		);

		await client.initialize().catch((err: unknown) => {
			this.logger.error(
				`[${resolved.name}] Virtual client initialization failed: ${err instanceof Error ? err.message : String(err)}`,
			);
		});
	}

	public async destroyClient(name: string): Promise<void> {
		const entry = this.registry.getEntry(name);
		if (!entry) {
			this.logger.warn(`Client "${name}" not found — nothing to destroy`);
			return;
		}

		this.logger.log(`[${name}] Destroying virtual client…`);
		await entry.client.destroy().catch((err: unknown) => {
			this.logger.error(
				`[${name}] Destroy failed: ${err instanceof Error ? err.message : String(err)}`,
			);
		});
		this.registry.remove(name);
		this.logger.log(`[${name}] Virtual client removed`);
	}
}
