import { ClientOptions, LocalAuth } from "whatsapp-web.js";

export interface NestWhatsClientOptions extends ClientOptions {
	name: string;
	prefix: string;
	printQR: boolean;
	ignoreSelf?: boolean;
}

export interface NestWhatsModuleOptions
	extends Partial<NestWhatsClientOptions> {
	clients?: Array<Partial<NestWhatsClientOptions>>;
}

export interface VirtualClientOptions {
	name: string;
	prefix?: string;
	printQR?: boolean;
}

export const NESTWHATS_DEFAULT_NAME = "default";
export const NESTWHATS_DEFAULT_PREFIX = "!";
export const NESTWHATS_GLOBAL_OPTIONS_TOKEN = Symbol.for(
	"NESTWHATS::GLOBAL_OPTIONS",
);

export interface NestWhatsGlobalOptions {
	prefix?: string;
	printQR?: boolean;
}

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

export function toClientOptions(
	options: NestWhatsClientOptions,
): ClientOptions {
	const {
		name: clientName,
		prefix: _p,
		printQR: _q,
		ignoreSelf: _i,
		...rest
	} = options;

	if (rest.authStrategy instanceof LocalAuth && !rest.authStrategy.clientId) {
		rest.authStrategy.clientId = clientName;
	}

	return rest as ClientOptions;
}
