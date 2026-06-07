import {
	Logger,
	OnApplicationBootstrap,
	OnApplicationShutdown,
	OnModuleInit,
} from "@nestjs/common";
import { toString as QRCodeString, toDataURL } from "qrcode";
import { Client, Events } from "whatsapp-web.js";
import {
	ClientStatus,
	ClientsRegistryService,
} from "./clients-registry.service";
import { CommandsService } from "./commands/commands.service";
import { ListenerRegistryService } from "./listeners/listener-registry.service";
import { NestWhatsClientOptions } from "./nestwhats-options.interface";

export function bindInternalEvents(
	client: Client,
	name: string,
	options: Pick<NestWhatsClientOptions, "printQR">,
	registry: ClientsRegistryService,
): void {
	const logger = new Logger("NestWhatsClient");

	client.on(Events.QR_RECEIVED, async (qr) => {
		const dataUrl = await toDataURL(qr);
		registry.updateStatus(name, ClientStatus.QrReceived, dataUrl);

		if (options.printQR) {
			QRCodeString(qr, { type: "terminal", small: true }, (err, url) => {
				if (err) {
					logger.error(`[${name}] Error generating QR code: ${err.message}`);
					return;
				}
				logger.verbose(`[${name}] Scan the QR code below to authenticate:`);
				console.log(url);
			});
		}
	});

	client.on(Events.AUTHENTICATED, () => {
		registry.updateStatus(name, ClientStatus.Authenticated);
	});

	client.on(Events.READY, () => {
		registry.updateStatus(name, ClientStatus.Ready);
		registry.updateInfo(name, client.info.pushname, client.info.wid.user);
	});

	client.on(Events.DISCONNECTED, () => {
		registry.updateStatus(name, ClientStatus.Disconnected);
	});

	client.on(Events.AUTHENTICATION_FAILURE, () => {
		registry.updateStatus(name, ClientStatus.Disconnected);
	});
}

export function bindListeners(
	client: Client,
	name: string,
	prefix: string,
	listenerRegistry: ListenerRegistryService,
	commandsService: CommandsService,
): void {
	for (const listener of listenerRegistry.getAll()) {
		const clients = listener.getClients();
		if (clients && !clients.includes(name)) continue;

		client[listener.getType()](listener.getEvent(), (...args) =>
			listener.execute(args),
		);
	}

	client.on(Events.MESSAGE_CREATE, (message) =>
		commandsService.handle(message, name, prefix),
	);
}

export class NestWhatsClientService
	implements OnModuleInit, OnApplicationBootstrap, OnApplicationShutdown
{
	private readonly logger = new Logger(NestWhatsClientService.name);

	public constructor(
		private readonly client: Client,
		private readonly options: NestWhatsClientOptions,
		private readonly clientsRegistry: ClientsRegistryService,
		private readonly commandsService: CommandsService,
		private readonly listenerRegistry: ListenerRegistryService,
	) {}

	public onModuleInit(): void {
		this.clientsRegistry.add({
			name: this.options.name,
			client: this.client,
			prefix: this.options.prefix,
		});

		bindInternalEvents(
			this.client,
			this.options.name,
			this.options,
			this.clientsRegistry,
		);
	}

	public onApplicationBootstrap(): void {
		bindListeners(
			this.client,
			this.options.name,
			this.options.prefix,
			this.listenerRegistry,
			this.commandsService,
		);

		this.client.initialize().catch((err: unknown) => {
			this.logger.error(
				`[${this.options.name}] Client initialization failed: ${err instanceof Error ? err.message : String(err)}`,
			);
		});
	}

	public async onApplicationShutdown(): Promise<void> {
		this.logger.log(`[${this.options.name}] Destroying client…`);
		await this.client.destroy();
		this.logger.log(`[${this.options.name}] Client destroyed`);
	}
}
