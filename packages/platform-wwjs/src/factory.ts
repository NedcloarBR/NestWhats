import type { NestWhatsAdapterFactory } from "nestwhats";
import type { LocalAuth as LocalAuthInstance } from "whatsapp-web.js";
import {
	WhatsAppWebJsAdapter,
	type WhatsAppWebJsAdapterOptions,
} from "./adapter.js";
import { WWEBJS_OPTIONS_SCHEMA } from "./options-schema.js";
import { WWEBJS_PLATFORM } from "./platform.js";
import { LocalAuth } from "./runtime.js";

/** Everything the adapter takes, plus how this factory is named. */
export interface WhatsAppWebJsFactoryOptions
	extends WhatsAppWebJsAdapterOptions {
	/**
	 * Id clients use to name this factory. Defaults to `whatsapp-web.js`; give
	 * a second one its own id to register the same platform twice with
	 * different configuration.
	 */
	id?: string;
}

/** What `LocalAuth` keeps that has to be carried to each client's own copy. */
type LocalAuthShape = LocalAuthInstance & {
	dataPath?: string;
	rmMaxRetries?: number;
};

/**
 * Builds whatsapp-web.js adapters, one per client, from one shared configuration.
 *
 * ```typescript
 * NestWhatsModule.forRoot({
 *   adapters: [new WhatsAppWebJsAdapterFactory({ authStrategy: new LocalAuth() })],
 *   clients: [
 *     new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, { name: 'personal' }),
 *     new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, { name: 'business' }),
 *   ],
 * })
 * ```
 *
 * Every client gets its own `LocalAuth`, named after the client, so each keeps
 * a separate session directory under `.wwebjs_auth/`.
 */
export class WhatsAppWebJsAdapterFactory
	implements
		NestWhatsAdapterFactory<WhatsAppWebJsAdapter, WhatsAppWebJsAdapterOptions>
{
	public readonly id: string;
	public readonly platform = WWEBJS_PLATFORM;
	public readonly optionsSchema = WWEBJS_OPTIONS_SCHEMA;
	private readonly config: WhatsAppWebJsAdapterOptions;

	public constructor(options: WhatsAppWebJsFactoryOptions = {}) {
		const { id = WWEBJS_PLATFORM.id, ...config } = options;
		this.id = id;
		this.config = config;
	}

	public create(
		clientName: string,
		overrides: WhatsAppWebJsAdapterOptions = {},
	): WhatsAppWebJsAdapter {
		const merged: WhatsAppWebJsAdapterOptions = {
			...this.config,
			...overrides,
		};

		if (merged.authStrategy instanceof LocalAuth) {
			// A LocalAuth instance is never shared between clients: it carries the
			// clientId that picks the session directory, so one shared object would
			// point every client at the same session.
			const base = merged.authStrategy as LocalAuthShape;
			// A client that passed its own authStrategy meant the clientId in it;
			// otherwise the client's name is what names its session.
			const explicit = "authStrategy" in overrides;
			merged.authStrategy = new LocalAuth({
				clientId: explicit
					? (base.clientId ?? clientName)
					: (clientName ?? base.clientId),
				dataPath: base.dataPath,
				rmMaxRetries: base.rmMaxRetries,
			});
		}

		return new WhatsAppWebJsAdapter(merged, clientName);
	}
}
