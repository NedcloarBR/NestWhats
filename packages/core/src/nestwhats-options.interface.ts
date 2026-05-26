import { ClientOptions } from "whatsapp-web.js";

export interface NestWhatsClientOptions extends ClientOptions {
	name: string;
	prefix: string;
	printQR: boolean;
	ignoreSelf?: boolean;
}

export const NESTWHATS_DEFAULT_NAME = "default";
export const NESTWHATS_DEFAULT_PREFIX = "!";

export function resolveClientOptions(
	options: Partial<NestWhatsClientOptions>,
): NestWhatsClientOptions {
	return {
		...options,
		name: options.name ?? NESTWHATS_DEFAULT_NAME,
		prefix: options.prefix ?? NESTWHATS_DEFAULT_PREFIX,
		printQR: options.printQR ?? true,
	} as NestWhatsClientOptions;
}
