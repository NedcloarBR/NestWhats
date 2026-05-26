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

		this.client.on(Events.QR_RECEIVED, async (qr) => {
			const dataUrl = await toDataURL(qr);
			this.clientsRegistry.updateStatus(
				this.options.name,
				ClientStatus.QrReceived,
				dataUrl,
			);

			if (this.options.printQR) {
				QRCodeString(qr, { type: "terminal", small: true }, (err, url) => {
					if (err) {
						this.logger.error(
							`[${this.options.name}] Error generating QR code: ${err.message}`,
						);
						return;
					}
					this.logger.verbose(
						`[${this.options.name}] Scan the QR code below to authenticate:`,
					);
					console.log(url);
				});
			}
		});

		this.client.on(Events.AUTHENTICATED, () => {
			this.clientsRegistry.updateStatus(this.options.name, ClientStatus.Authenticated);
		});

		this.client.on(Events.READY, () => {
			this.clientsRegistry.updateStatus(this.options.name, ClientStatus.Ready);
			this.clientsRegistry.updateInfo(
				this.options.name,
				this.client.info.pushname,
				this.client.info.wid.user,
			);
		});

		this.client.on(Events.DISCONNECTED, () => {
			this.clientsRegistry.updateStatus(this.options.name, ClientStatus.Disconnected);
		});

		this.client.on(Events.AUTHENTICATION_FAILURE, () => {
			this.clientsRegistry.updateStatus(this.options.name, ClientStatus.Disconnected);
		});
	}

	public onApplicationBootstrap(): void {
		for (const listener of this.listenerRegistry.getAll()) {
			const clients = listener.getClients();
			if (clients && !clients.includes(this.options.name)) continue;

			this.client[listener.getType()](listener.getEvent(), (...args) =>
				listener.execute(args),
			);
		}

		this.client.on(Events.MESSAGE_CREATE, (message) =>
			this.commandsService.handle(message, this.options.name, this.options.prefix),
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
