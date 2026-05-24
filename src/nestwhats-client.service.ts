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
	private readonly name: string;
	private readonly prefix: string;
	private readonly printQR: boolean;

	public constructor(
		private readonly client: Client,
		private readonly options: NestWhatsClientOptions,
		private readonly commandsService: CommandsService,
		private readonly listenerRegistry: ListenerRegistryService,
		private readonly clientsRegistry: ClientsRegistryService,
	) {
		this.name = options.name ?? "default";
		this.prefix = options.prefix ?? "!";
		this.printQR = options.printQR ?? true;
	}

	public onModuleInit(): void {
		this.clientsRegistry.add({
			name: this.name,
			client: this.client,
			prefix: this.prefix,
		});

		this.client.on(Events.QR_RECEIVED, async (qr) => {
			const dataUrl = await toDataURL(qr);
			this.clientsRegistry.updateStatus(
				this.name,
				ClientStatus.QrReceived,
				dataUrl,
			);

			if (this.printQR) {
				QRCodeString(qr, { type: "terminal", small: true }, (err, url) => {
					if (err) {
						this.logger.error(
							`[${this.name}] Error generating QR code: ${err.message}`,
						);
						return;
					}
					this.logger.verbose(
						`[${this.name}] Scan the QR code below to authenticate:`,
					);
					console.log(url);
				});
			}
		});

		this.client.once(Events.AUTHENTICATED, () => {
			this.clientsRegistry.updateStatus(this.name, ClientStatus.Authenticated);
		});

		this.client.once(Events.READY, () => {
			this.clientsRegistry.updateStatus(this.name, ClientStatus.Ready);
			this.clientsRegistry.updateInfo(
				this.name,
				this.client.info.pushname,
				this.client.info.wid.user,
			);
		});

		this.client.on(Events.DISCONNECTED, () => {
			this.clientsRegistry.updateStatus(this.name, ClientStatus.Disconnected);
		});
	}

	public onApplicationBootstrap(): void {
		for (const listener of this.listenerRegistry.getAll()) {
			const clients = listener.getClients();
			if (clients && !clients.includes(this.name)) continue;

			this.client[listener.getType()](listener.getEvent(), (...args) =>
				listener.execute(args),
			);
		}

		this.client.on(Events.MESSAGE_CREATE, async (message) => {
			if (!message?.body?.length) return;

			const content = message.body.toLowerCase();

			if (this.prefix && content.startsWith(this.prefix)) {
				const args = content.substring(this.prefix.length).split(/ +/g);
				const cmd = args.shift();

				if (cmd) {
					const command = this.commandsService.get(cmd);
					if (command) {
						const clients = command.getClients();
						if (!clients || clients.includes(this.name))
							return command.execute([message]);
					}
				}
			}

			for (const [prefix, commands] of this.commandsService.prefixCache) {
				if (content.startsWith(prefix)) {
					const args = content.substring(prefix.length).split(/ +/g);
					const cmd = args.shift();

					if (cmd) {
						const command = commands.get(cmd);
						if (command) {
							const clients = command.getClients();
							if (!clients || clients.includes(this.name))
								return command.execute([message]);
						}
					}
				}
			}
		});

		this.client.initialize().catch((err: unknown) => {
			this.logger.error(
				`[${this.name}] Client initialization failed: ${err instanceof Error ? err.message : String(err)}`,
			);
		});
	}

	public onApplicationShutdown(): void {
		this.client.destroy();
	}
}
