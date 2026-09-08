import {
	Inject,
	Injectable,
	Logger,
	OnApplicationBootstrap,
	OnApplicationShutdown,
	Optional,
} from "@nestjs/common";
import type { NestWhatsAdapterFactory } from "../adapter/adapter-factory.interface.js";
import type {
	AdapterOptionsSchema,
	AdapterPlatform,
} from "../adapter/index.js";
import { CommandsService } from "../commands/commands.service.js";
import { ListenerRegistryService } from "../listeners/listener-registry.service.js";
import { resolveFactory } from "../module/adapter-registry.js";
import {
	AdapterRef,
	NESTWHATS_DEFAULT_PREFIX,
	NESTWHATS_GLOBAL_OPTIONS_TOKEN,
	NestWhatsGlobalOptions,
	VirtualClientOptions,
	VirtualClientOptionsFor,
} from "../module/module-options.interface.js";
import type { PersistedVirtualClient } from "../storage/index.js";
import { NestWhatsClient } from "./client.js";
import { bindInternalEvents, bindListeners } from "./client.service.js";
import { ClientsRegistryService } from "./clients-registry.service.js";

/** An adapter available to create clients with, and the options it offers. */
export interface RegisteredAdapter {
	/** The factory's id — what `createClient` accepts for `adapter`. */
	name: string;
	optionsSchema: AdapterOptionsSchema;
	/** How the platform presents itself, so a UI can label it before it runs. */
	platform?: AdapterPlatform;
}

/**
 * What gets written to storage.
 *
 * The adapter is stored as the resolved factory id, never as the class or the
 * instance the caller may have passed: a file can only hold the id, and it has
 * to name the same factory on the next boot.
 */
function toPersisted(
	options: VirtualClientOptions,
	adapterId: string,
): PersistedVirtualClient {
	return {
		name: options.name,
		adapter: adapterId,
		options: options.options,
		prefix: options.prefix,
		ignoreSelf: options.ignoreSelf,
	};
}

/**
 * Creates, updates and destroys clients at runtime, and persists them so they
 * come back after a restart.
 *
 * Clients declared in code are never persisted — they come from the module
 * every boot. Only the ones created here are.
 */
@Injectable()
export class NestWhatsClientManagerService
	implements OnApplicationBootstrap, OnApplicationShutdown
{
	private readonly logger = new Logger(NestWhatsClientManagerService.name);
	private readonly persisted = new Map<string, PersistedVirtualClient>();
	private stopWatcher?: () => void;
	private readonly disposers = new Map<string, () => void>();
	private restoring = false;

	public constructor(
		private readonly registry: ClientsRegistryService,
		private readonly listenerRegistry: ListenerRegistryService,
		private readonly commandsService: CommandsService,
		@Optional()
		@Inject(NESTWHATS_GLOBAL_OPTIONS_TOKEN)
		private readonly globalOptions?: NestWhatsGlobalOptions,
	) {}

	private resolveFactory(
		options: VirtualClientOptions,
	): NestWhatsAdapterFactory {
		return resolveFactory(
			this.globalOptions?.adapterRegistry,
			options.adapter,
			options.name,
		);
	}

	/** Restores the virtual clients persisted by a previous run. */
	public async onApplicationBootstrap(): Promise<void> {
		const storage = this.globalOptions?.storage;
		if (!storage) return;

		let state: Awaited<ReturnType<typeof storage.load>>;
		try {
			state = await storage.load();
		} catch (err: unknown) {
			this.logger.warn(
				`Client storage could not be read — restore skipped: ${err instanceof Error ? err.message : String(err)}`,
			);
			return;
		}

		this.restoring = true;
		try {
			for (const config of state.virtualClients) {
				try {
					await this.createClient(config);
					this.persisted.set(config.name, config);
				} catch (err: unknown) {
					this.logger.error(
						`Failed to restore client "${config.name}": ${err instanceof Error ? err.message : String(err)}`,
					);
				}
			}
		} finally {
			this.restoring = false;
		}

		this.stopWatcher = storage.watch?.((next, error) => {
			if (error) {
				this.logger.warn(
					`Client storage has a syntax error — sync skipped: ${error.message}`,
				);
				return;
			}
			if (next) void this.syncWithStorage(next.virtualClients);
		});
	}

	/** Applies an externally edited storage file to the running clients. */
	private async syncWithStorage(
		virtualClients: PersistedVirtualClient[],
	): Promise<void> {
		const wanted = new Map(virtualClients.map((c) => [c.name, c]));

		for (const name of [...this.persisted.keys()]) {
			if (wanted.has(name)) continue;
			this.logger.log(`Storage changed — removing client "${name}"`);
			await this.destroyClient(name).catch(() => {});
		}

		for (const [name, config] of wanted) {
			if (this.persisted.has(name)) continue;
			this.logger.log(`Storage changed — creating client "${name}"`);
			this.restoring = true;
			try {
				await this.createClient(config);
				this.persisted.set(name, config);
			} catch (err: unknown) {
				this.logger.error(
					`Failed to create client "${name}": ${err instanceof Error ? err.message : String(err)}`,
				);
			} finally {
				this.restoring = false;
			}
		}
	}

	private async persist(): Promise<void> {
		const storage = this.globalOptions?.storage;
		if (!storage) return;
		try {
			await storage.save({ virtualClients: [...this.persisted.values()] });
		} catch (err: unknown) {
			this.logger.error(
				`Could not persist clients: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}

	/**
	 * Creates a client at runtime. Pass the adapter class and `options` is
	 * checked against it; name it by string (a restored config) and it cannot be.
	 */
	public async createClient<T extends AdapterRef | undefined>(
		options: VirtualClientOptionsFor<T>,
	): Promise<void>;
	public async createClient(options: VirtualClientOptions): Promise<void> {
		if (this.registry.getEntry(options.name)) {
			this.logger.warn(
				`Client "${options.name}" is already registered — skipping`,
			);
			return;
		}

		const factory = this.resolveFactory(options);
		const adapter = factory.create(options.name, options.options);
		const client = new NestWhatsClient(options.name, adapter, {
			options: options.options,
			platform: factory.platform,
			adapterId: factory.id,
		});
		const prefix = options.prefix ?? NESTWHATS_DEFAULT_PREFIX;

		this.disposers.set(
			options.name,
			bindInternalEvents(client, options.name, this.registry, {
				disconnectDebounceMs: this.globalOptions?.disconnectDebounceMs,
				reconnect: this.globalOptions?.reconnect,
			}),
		);
		this.registry.add({
			name: options.name,
			adapter,
			client,
			prefix,
			platform: factory.platform,
			virtual: true,
		});
		bindListeners(
			client,
			this.registry,
			this.listenerRegistry,
			this.commandsService,
			options.ignoreSelf,
		);

		// Persist before initialize: a client that fails to authenticate must still
		// come back on the next boot, otherwise a transient failure silently drops it.
		if (!this.restoring) {
			this.persisted.set(options.name, toPersisted(options, factory.id));
			await this.persist();
		}

		await adapter.initialize().catch((err: unknown) => {
			this.logger.error(
				`[${options.name}] Virtual client initialization failed: ${err instanceof Error ? err.message : String(err)}`,
			);
		});
	}

	/**
	 * Changes a live client's configuration and persists it.
	 *
	 * A prefix change is applied in place. An options change is not: they were
	 * baked in when the factory built the adapter, so the client is torn down
	 * and started again, which drops its connection for a moment. Credentials
	 * live under the same client name, so it comes back authenticated rather
	 * than asking for a new QR code.
	 */
	public async updateClient(
		name: string,
		changes: { prefix?: string; options?: Record<string, unknown> },
	): Promise<void> {
		const entry = this.registry.getEntry(name);
		if (!entry) {
			throw new Error(`[NestWhats] Client "${name}" not found`);
		}
		if (!entry.virtual) {
			throw new Error(
				`[NestWhats] Client "${name}" is not a virtual client — clients declared in forRoot are configured in code`,
			);
		}

		const persisted = this.persisted.get(name);

		if (changes.options !== undefined) {
			const next: PersistedVirtualClient = {
				...persisted,
				name,
				prefix: changes.prefix ?? persisted?.prefix,
				options: changes.options,
			};
			this.logger.log(`[${name}] Applying new options — recreating client…`);
			await this.destroyClient(name);
			await this.createClient(next);
			return;
		}

		if (changes.prefix !== undefined) {
			this.registry.updatePrefix(name, changes.prefix);
			if (persisted) {
				this.persisted.set(name, { ...persisted, prefix: changes.prefix });
				await this.persist();
			}
			this.logger.log(`[${name}] Prefix changed to "${changes.prefix}"`);
		}
	}

	/** Stops a virtual client and forgets it, including from storage. */
	public async destroyClient(name: string): Promise<void> {
		const entry = this.registry.getEntry(name);
		if (!entry) {
			this.logger.warn(`Client "${name}" not found — nothing to destroy`);
			return;
		}

		if (!entry.virtual) {
			throw new Error(
				`[NestWhats] Client "${name}" is not a virtual client — module clients are managed by the application lifecycle and cannot be destroyed at runtime`,
			);
		}

		this.logger.log(`[${name}] Destroying virtual client…`);
		await entry.adapter.destroy().catch((err: unknown) => {
			this.logger.error(
				`[${name}] Destroy failed: ${err instanceof Error ? err.message : String(err)}`,
			);
		});
		this.disposers.get(name)?.();
		this.disposers.delete(name);
		this.registry.remove(name);

		if (this.persisted.delete(name)) await this.persist();
		this.logger.log(`[${name}] Virtual client removed`);
	}

	/**
	 * The adapters given to `forRoot`: the ids `createClient` accepts for
	 * `adapter`, each with the options and badge it declares for a UI.
	 */
	public getRegisteredAdapters(): RegisteredAdapter[] {
		const registry = this.globalOptions?.adapterRegistry;
		if (!registry) return [];
		return [...registry.values()].map((factory) => ({
			name: factory.id,
			optionsSchema: factory.optionsSchema ?? [],
			platform: factory.platform,
		}));
	}

	/** Virtual clients as they are stored, which is what comes back on the next boot. */
	public getPersistedVirtualClients(): PersistedVirtualClient[] {
		return [...this.persisted.values()];
	}

	public async onApplicationShutdown(): Promise<void> {
		this.stopWatcher?.();
		// Shutting down is not deletion: tear the clients down without touching
		// storage, so they are restored on the next boot.
		const virtuals = this.registry.getAll().filter((entry) => entry.virtual);
		await Promise.all(
			virtuals.map(async (entry) => {
				this.logger.log(`[${entry.name}] Destroying virtual client…`);
				this.disposers.get(entry.name)?.();
				this.disposers.delete(entry.name);
				await entry.adapter.destroy().catch((err: unknown) => {
					this.logger.error(
						`[${entry.name}] Destroy failed: ${err instanceof Error ? err.message : String(err)}`,
					);
				});
				this.registry.remove(entry.name);
			}),
		);
	}
}
