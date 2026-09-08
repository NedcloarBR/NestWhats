import {
	Logger,
	OnApplicationBootstrap,
	OnApplicationShutdown,
	OnModuleInit,
} from "@nestjs/common";
import {
	ClientStatus,
	ConnectionEventSource,
	type ConnectionEventSourceOptions,
	type ConnectionUpdate,
	DERIVED_CONNECTION_EVENTS,
	type ReconnectPolicyOptions,
	ReconnectRunner,
} from "../adapter/index.js";
import { CommandsService } from "../commands/commands.service.js";
import { NESTWHATS_MANAGED_LISTENER } from "../listeners/listener.constants.js";
import { ListenerRegistryService } from "../listeners/listener-registry.service.js";
import {
	NESTWHATS_DEFAULT_PREFIX,
	ResolvedClientOptions,
} from "../module/module-options.interface.js";
import type { NestWhatsMessage } from "../structures/index.js";
import type { NestWhatsClient } from "./client.js";
import { ClientsRegistryService } from "./clients-registry.service.js";

/** How a client's connection updates are turned into events. */
export interface InternalEventsOptions extends ConnectionEventSourceOptions {
	/** When set, the core reconnects the client after a drop. Off by default. */
	reconnect?: ReconnectPolicyOptions;
}

function createReconnectRunner(
	client: NestWhatsClient,
	name: string,
	registry: ClientsRegistryService,
	options: ReconnectPolicyOptions,
): ReconnectRunner {
	return new ReconnectRunner(
		{
			reconnect: () => client.adapter.initialize(),
			// The timer may have outlived the drop: only act if the client is
			// still down, so a flap that recovered on its own is left alone.
			isStillDown: () =>
				registry.getEntry(name)?.status === ClientStatus.Disconnected,
			onAttempt: (attempt, delayMs) =>
				bindLogger.log(
					`[${name}] Reconnecting in ${Math.round(delayMs / 1000)}s (attempt ${attempt})`,
				),
			onGiveUp: (reason) =>
				bindLogger.warn(`[${name}] Not reconnecting: ${reason}`),
			onError: (err, attempt) =>
				bindLogger.error(
					`[${name}] Reconnect attempt ${attempt} failed: ${err instanceof Error ? err.message : String(err)}`,
				),
		},
		options,
	);
}

/**
 * Wires the adapter's `connectionUpdate` into the registry and expands it into
 * the events handlers subscribe to. Adapters report state; the core decides
 * what that means.
 *
 * Returns a cleanup function that drops any scheduled announcement or reconnect.
 */
export function bindInternalEvents(
	client: NestWhatsClient,
	name: string,
	registry: ClientsRegistryService,
	options: InternalEventsOptions = {},
): () => void {
	const { adapter } = client;

	const events = new ConnectionEventSource(
		(event, args) => client.events.emit(event, ...args),
		options,
	);
	const reconnect = options.reconnect
		? createReconnectRunner(client, name, registry, options.reconnect)
		: undefined;

	adapter.on("connectionUpdate", (update: ConnectionUpdate) => {
		// The registry always reflects reality immediately, debounce or not: the
		// dashboard should show a client as down the moment it drops.
		registry.updateStatus(name, update.status, {
			qr: update.qr,
			pairingCode: update.pairingCode,
		});
		if (update.status === ClientStatus.Ready) {
			const info = adapter.getInfo();
			if (info) registry.updateInfo(name, info);
			reconnect?.succeeded();
		}
		if (update.status === ClientStatus.Disconnected) {
			reconnect?.schedule(update.reason);
		}

		events.apply(update);
	});

	return () => {
		events.dispose();
		reconnect?.cancel();
	};
}

const bindLogger = new Logger("NestWhats");

function getListenerKey(listener: {
	getClass(): { name?: string } | undefined;
	getHandler(): ((...args: unknown[]) => unknown) | undefined;
}): string {
	const className = listener.getClass()?.name ?? "Unknown";
	const methodName = listener.getHandler()?.name ?? "unknown";
	return `${className}.${methodName}`;
}

function logHandlerError(name: string, source: string, err: unknown): void {
	const error = err instanceof Error ? err : new Error(String(err));
	bindLogger.error(
		`[${name}] Error in ${source}: ${error.message}`,
		error.stack,
	);
}

/**
 * Subscribes the application's discovered listeners to a client, and routes its
 * messages to the command dispatcher.
 *
 * Derived events come from the core, everything else straight from the adapter,
 * so `supportedEvents` only gates what the platform actually owns — a listener
 * bound to an event the adapter cannot emit is warned about instead of failing
 * silently.
 */
export function bindListeners(
	client: NestWhatsClient,
	registry: ClientsRegistryService,
	listenerRegistry: ListenerRegistryService,
	commandsService: CommandsService,
	ignoreSelf?: boolean,
): void {
	const { adapter, name } = client;
	const derived: ReadonlySet<string> = new Set(DERIVED_CONNECTION_EVENTS);

	for (const listener of listenerRegistry.getAll()) {
		const handler = listener.getHandler();
		if (handler && Reflect.getMetadata(NESTWHATS_MANAGED_LISTENER, handler))
			continue;

		const clients = listener.getClients();
		if (clients && !clients.includes(name)) continue;

		const event = listener.getEvent();
		// Derived events come from the core, everything else straight from the
		// platform — so `supportedEvents` only gates what the adapter owns.
		const isDerived = derived.has(event);
		if (
			!isDerived &&
			adapter.supportedEvents &&
			!adapter.supportedEvents.has(event)
		) {
			bindLogger.warn(
				`[${name}] Event "${event}" is not supported by this adapter — listener "${getListenerKey(listener)}" will never fire on this client`,
			);
			continue;
		}

		const source = isDerived ? client.events : adapter;
		source[listener.getType()](event, async (...args: unknown[]) => {
			try {
				await listener.execute(args, client);
			} catch (err) {
				logHandlerError(name, `"${event}" listener`, err);
			}
		});
	}

	adapter.on("messageUpsert", (message: NestWhatsMessage) => {
		if (ignoreSelf && message.fromMe) return;
		// Read the prefix per message rather than capturing it: changing it is a
		// hot edit, and a captured value would keep the old one until a restart.
		const prefix = registry.getEntry(name)?.prefix ?? NESTWHATS_DEFAULT_PREFIX;
		commandsService
			.handle(message, name, prefix, client)
			.catch((err) => logHandlerError(name, "command handler", err));
	});
}

/** Lifecycle of one client declared in code: register, bind, initialize, destroy. */
export class NestWhatsClientService
	implements OnModuleInit, OnApplicationBootstrap, OnApplicationShutdown
{
	private readonly logger = new Logger(NestWhatsClientService.name);
	private disposeInternalEvents?: () => void;

	public constructor(
		private readonly client: NestWhatsClient,
		private readonly options: ResolvedClientOptions,
		private readonly clientsRegistry: ClientsRegistryService,
		private readonly commandsService: CommandsService,
		private readonly listenerRegistry: ListenerRegistryService,
	) {}

	public onModuleInit(): void {
		this.clientsRegistry.add({
			name: this.options.name,
			adapter: this.client.adapter,
			client: this.client,
			prefix: this.options.prefix ?? "!",
			platform: this.options.platform,
		});

		this.disposeInternalEvents = bindInternalEvents(
			this.client,
			this.options.name,
			this.clientsRegistry,
			{
				disconnectDebounceMs: this.options.disconnectDebounceMs,
				reconnect: this.options.reconnect,
			},
		);
	}

	public onApplicationBootstrap(): void {
		bindListeners(
			this.client,
			this.clientsRegistry,
			this.listenerRegistry,
			this.commandsService,
			this.options.ignoreSelf,
		);

		this.client.adapter.initialize().catch((err: unknown) => {
			this.logger.error(
				`[${this.options.name}] Client initialization failed: ${err instanceof Error ? err.message : String(err)}`,
			);
		});
	}

	public async onApplicationShutdown(): Promise<void> {
		this.disposeInternalEvents?.();
		this.logger.log(`[${this.options.name}] Destroying client…`);
		try {
			await this.client.adapter.destroy();
			this.logger.log(`[${this.options.name}] Client destroyed`);
		} catch (err: unknown) {
			// A failed destroy must not abort the shutdown of the remaining clients.
			this.logger.error(
				`[${this.options.name}] Destroy failed: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}
}
