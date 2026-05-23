import { ClientOptions } from "whatsapp-web.js";

export interface NestWhatsClientOptions extends ClientOptions {
	name?: string;
	prefix?: string;
}
