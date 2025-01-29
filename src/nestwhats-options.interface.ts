import { ClientOptions } from "whatsapp-web.js";

export interface NestWhatsModuleOptions extends ClientOptions {
	prefix?: string;
}
