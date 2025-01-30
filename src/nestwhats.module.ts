import {
	Global,
	Logger,
	Module,
	OnApplicationBootstrap,
	OnApplicationShutdown,
	OnModuleInit,
} from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { toString as QRCodeString } from "qrcode";
import { Client, Events } from "whatsapp-web.js";
import { CommandsModule } from "./commands/commands.module";
import { ListenersModule } from "./listeners";
import { ExplorerService } from "./nestwhats-explorer.service";
import {
	ConfigurableModuleClass,
	NESTWHATS_MODULE_OPTIONS,
} from "./nestwhats.module-definition";
import * as ProvidersMap from "./providers";

const Providers = Object.values(ProvidersMap);

@Global()
@Module({
	imports: [DiscoveryModule, ListenersModule, CommandsModule],
	providers: [ExplorerService, ...Providers],
	exports: [
		ListenersModule,
		CommandsModule,
		ExplorerService,
		...Providers,
		NESTWHATS_MODULE_OPTIONS,
	],
})
export class NestWhatsModule
	extends ConfigurableModuleClass
	implements OnApplicationBootstrap, OnApplicationShutdown, OnModuleInit
{
	private readonly logger = new Logger(NestWhatsModule.name);

	public constructor(private readonly client: Client) {
		super();
	}

	public onApplicationBootstrap(): void {
		this.client.initialize();
	}

	public onApplicationShutdown(signal?: string): void {
		this.client.destroy();
	}

	public onModuleInit(): void {
		this.client.once(Events.QR_RECEIVED, (qr) => {
			QRCodeString(qr, { type: "terminal", small: true }, (err, url) => {
				if (err) {
					this.logger.error(`Error generating QR code: ${err.message}`);
					return;
				}
				this.logger.verbose("Scan the QR code below to authenticate:");
				console.log(url);
			});
		});
	}
}
