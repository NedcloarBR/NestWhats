import { Provider } from "@nestjs/common";
import { Client } from "whatsapp-web.js";
import { NestWhatsModuleOptions } from "../nestwhats-options.interface";
import { NESTWHATS_MODULE_OPTIONS } from "../nestwhats.module-definition";

export const ClientProvider: Provider<Client> = {
	provide: Client,
	useFactory: (options: NestWhatsModuleOptions) => new Client(options),
	inject: [NESTWHATS_MODULE_OPTIONS],
};
