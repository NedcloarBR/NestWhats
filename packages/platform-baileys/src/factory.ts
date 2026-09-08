import type { NestWhatsAdapterFactory } from "nestwhats";
import { BaileysAdapter, type BaileysAdapterOptions } from "./adapter.js";
import { BAILEYS_OPTIONS_SCHEMA } from "./options-schema.js";
import { BAILEYS_PLATFORM } from "./platform.js";

/** Everything the adapter takes, plus how this factory is named. */
export interface BaileysFactoryOptions extends BaileysAdapterOptions {
	/**
	 * Id clients use to name this factory. Defaults to `baileys`; give a
	 * second one its own id to register the same platform twice with different
	 * configuration.
	 */
	id?: string;
}

/**
 * Builds Baileys adapters, one per client, from one shared configuration.
 *
 * ```typescript
 * NestWhatsModule.forRoot({
 *   adapters: [new BaileysAdapterFactory({ authDir: '.baileys_auth' })],
 *   clients: [
 *     new NestWhatsClientConfig(BaileysAdapterFactory, { name: 'personal' }),
 *     new NestWhatsClientConfig(BaileysAdapterFactory, {
 *       name: 'business',
 *       options: { phoneNumber: '5511999998888' },
 *     }),
 *   ],
 *   reconnect: {},
 * })
 * ```
 *
 * Every client gets its own session folder, `session-<name>` under `authDir`.
 * Nothing in the shared configuration is an object that could carry state
 * from one client to the next — the credentials are loaded from that folder
 * inside each adapter's own `initialize()` — so merging the client's options
 * over the factory's is all `create` has to do to keep them apart.
 */
export class BaileysAdapterFactory
	implements NestWhatsAdapterFactory<BaileysAdapter, BaileysAdapterOptions>
{
	public readonly id: string;
	public readonly platform = BAILEYS_PLATFORM;
	public readonly optionsSchema = BAILEYS_OPTIONS_SCHEMA;
	private readonly config: BaileysAdapterOptions;

	public constructor(options: BaileysFactoryOptions = {}) {
		const { id = BAILEYS_PLATFORM.id, ...config } = options;
		this.id = id;
		this.config = config;
	}

	public create(
		clientName: string,
		overrides: BaileysAdapterOptions = {},
	): BaileysAdapter {
		return new BaileysAdapter({ ...this.config, ...overrides }, clientName);
	}
}
