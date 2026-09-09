import {
	Inject,
	Injectable,
	Logger,
	OnApplicationBootstrap,
	OnApplicationShutdown,
	Optional,
} from "@nestjs/common";
import { DiscoveryService, MetadataScanner } from "@nestjs/core";
import { ClientsRegistryService, ListenerDiscovery } from "nestwhats";
import { WEBHOOK_HANDLER_METADATA } from "../decorators/webhook.decorator.js";
import { getDiscoveryKey } from "../discovery/discovery-key.util.js";
import type { WebhookStorageState } from "../storage/index.js";
import { DEFAULT_BINDING_KEY, WEBHOOK_OPTIONS } from "../webhook.constants.js";
import type {
	NestWhatsWebhookLoggerOptions,
	NestWhatsWebhookOptions,
} from "../webhook-options.interface.js";
import { WebhookEventRegistryService } from "./webhook-event-registry.service.js";

interface BoundEntry {
	discovery: ListenerDiscovery;
	fn: (...args: unknown[]) => void;
}

/**
 * Which handlers to bind or unbind, and for which client.
 *
 * Both fields default to everything: no `client` binds for every registered
 * client, no `handlers` binds every `@Webhook()` handler discovered.
 */
export interface WebhookBindOptions {
	/** Which client; every registered client when omitted. */
	client?: string;
	/** Which handlers, by `ClassName.methodName`; all of them when omitted. */
	handlers?: string[];
}

/**
 * Binds and unbinds `@Webhook()` handlers at runtime, per client.
 *
 * A handler marked with `@Webhook()` is skipped by the automatic binding the
 * core does at bootstrap, and only starts receiving events once bound here.
 * Bindings are persisted through the configured storage, so they survive a
 * restart, and are restored on bootstrap.
 */
@Injectable()
export class NestWhatsWebhookService
	implements OnApplicationBootstrap, OnApplicationShutdown
{
	private readonly logger = new Logger(NestWhatsWebhookService.name);
	private readonly bindings = new Map<string, BoundEntry[]>();
	private readonly warnCount = new Map<string, number>();
	private readonly subscribers = new Set<() => void>();
	private stopWatcher?: () => void;
	private lastSavedState?: string;
	private hasPendingStorageError = false;

	public constructor(
		private readonly registry: ClientsRegistryService,
		private readonly webhookEventRegistry: WebhookEventRegistryService,
		private readonly discoveryService: DiscoveryService,
		private readonly metadataScanner: MetadataScanner,
		@Optional()
		@Inject(WEBHOOK_OPTIONS)
		private readonly options?: NestWhatsWebhookOptions,
	) {}

	public async onApplicationBootstrap(): Promise<void> {
		this.warnOrphanWebhookHandlers();

		await this.restoreState();

		if (this.options?.storage?.watch) {
			this.stopWatcher = this.options.storage.watch(async (state, error) => {
				if (error) {
					this.hasPendingStorageError = true;
					this.warnOnce(
						"syntaxError",
						`Storage file has a syntax error — sync skipped: ${error.message}`,
					);
					return;
				}
				if (!state) return;
				const incoming = JSON.stringify(state);
				const recovering = this.hasPendingStorageError;
				if (!recovering && incoming === this.lastSavedState) return;
				this.lastSavedState = incoming;
				this.hasPendingStorageError = false;
				if (recovering) {
					this.log("fileChanged", "Storage file recovered — syncing bindings");
				}
				await this.syncFromState(state);
			});
		}
	}

	public onApplicationShutdown(): void {
		this.stopWatcher?.();
	}

	public subscribe(listener: () => void): () => void {
		this.subscribers.add(listener);
		return () => this.subscribers.delete(listener);
	}

	private notify(): void {
		for (const fn of this.subscribers) fn();
	}

	public getHandlers() {
		return this.webhookEventRegistry.getAll().map((d) => ({
			key: getDiscoveryKey(d),
			event: d.getEvent(),
			type: d.getType(),
		}));
	}

	public getBoundHandlers(options?: WebhookBindOptions): string[] {
		const key = options?.client ?? DEFAULT_BINDING_KEY;
		return (this.bindings.get(key) ?? []).map((e) =>
			getDiscoveryKey(e.discovery),
		);
	}

	public register(options?: WebhookBindOptions): void {
		const clientName = options?.client;
		const filterKeys = options?.handlers;

		if (clientName && !this.registry.getClient(clientName)) {
			this.logger.warn(
				`Cannot bind webhook handlers — client "${clientName}" is not registered (registered clients: ${
					this.registry
						.getAll()
						.map((e) => e.name)
						.join(", ") || "none"
				})`,
			);
			return;
		}

		if (filterKeys) {
			const known = new Set(
				this.webhookEventRegistry.getAll().map(getDiscoveryKey),
			);
			for (const key of filterKeys) {
				if (!known.has(key)) {
					this.logger.warn(
						`Unknown webhook handler "${key}" — discovered handlers: ${[...known].join(", ") || "none"}`,
					);
				}
			}
		}

		if (!filterKeys) {
			this._unbindHandlers(clientName);
		}

		const added = this._bindHandlers(clientName, filterKeys);

		for (const entry of added) {
			this.log(
				"bind",
				`Bound "${getDiscoveryKey(entry.discovery)}" (${entry.discovery.getEvent()}·${entry.discovery.getType()}) → client "${clientName ?? "default"}"`,
			);
		}

		void this.persistState();
		this.notify();
	}

	public unregister(options?: WebhookBindOptions): void {
		const clientName = options?.client;
		const filterKeys = options?.handlers;

		if (clientName && !this.bindings.has(clientName)) {
			this.logger.warn(
				`Nothing to unbind — client "${clientName}" has no webhook bindings`,
			);
			return;
		}

		const removed = this._unbindHandlers(clientName, filterKeys);

		for (const entry of removed) {
			this.log(
				"unbind",
				`Unbound "${getDiscoveryKey(entry.discovery)}" (${entry.discovery.getEvent()}·${entry.discovery.getType()}) → client "${clientName ?? "default"}"`,
			);
		}

		void this.persistState();
		this.notify();
	}

	private warnOrphanWebhookHandlers(): void {
		const discovered = new Set(
			this.webhookEventRegistry.getAll().map((d) => d.getHandler()),
		);

		for (const wrapper of this.discoveryService.getProviders()) {
			const { instance } = wrapper;
			if (!instance || !Object.getPrototypeOf(instance)) continue;
			if (!wrapper.isDependencyTreeStatic()) continue;

			const prototype = Object.getPrototypeOf(instance);
			for (const methodName of this.metadataScanner.getAllMethodNames(
				prototype,
			)) {
				const handler = instance[methodName];
				if (
					Reflect.getMetadata(WEBHOOK_HANDLER_METADATA, handler) === undefined
				)
					continue;
				if (discovered.has(handler)) continue;
				this.logger.warn(
					`@Webhook() on "${instance.constructor.name}.${methodName}" has no @On/@Once decorator — it will never be bound`,
				);
			}
		}
	}

	private _bindHandlers(
		clientName: string | undefined,
		filterKeys?: string[],
	): BoundEntry[] {
		const key = clientName ?? DEFAULT_BINDING_KEY;
		const client = this.registry.getClient(clientName);
		if (!client) return [];
		const { adapter } = client;

		const current = this.bindings.get(key) ?? [];
		const toAdd: BoundEntry[] = [];

		for (const discovery of this.webhookEventRegistry.getAll()) {
			const handlerKey = getDiscoveryKey(discovery);
			if (filterKeys && !filterKeys.includes(handlerKey)) continue;

			const clients = discovery.getClients();
			if (clients && !clients.includes(client.name)) continue;

			const event = discovery.getEvent();
			if (adapter.supportedEvents && !adapter.supportedEvents.has(event)) {
				this.logger.warn(
					`Event "${event}" is not supported by the adapter of client "${client.name}" — handler "${handlerKey}" skipped`,
				);
				continue;
			}

			if (current.some((e) => e.discovery === discovery)) continue;

			const fn = (...args: unknown[]) => {
				void Promise.resolve(discovery.execute(args, client)).catch(
					(err: unknown) => {
						this.logger.error(
							`[${client.name}] Error in webhook handler "${handlerKey}": ${err instanceof Error ? err.message : String(err)}`,
						);
					},
				);
			};
			adapter[discovery.getType()](event, fn);
			toAdd.push({ discovery, fn });
		}

		this.bindings.set(key, [...current, ...toAdd]);
		return toAdd;
	}

	private _unbindHandlers(
		clientName: string | undefined,
		filterKeys?: string[],
	): BoundEntry[] {
		const key = clientName ?? DEFAULT_BINDING_KEY;
		const entries = this.bindings.get(key) ?? [];
		const adapter = this.registry.get(clientName);

		const toRemove = filterKeys
			? entries.filter((e) => filterKeys.includes(getDiscoveryKey(e.discovery)))
			: entries;
		const toKeep = filterKeys
			? entries.filter(
					(e) => !filterKeys.includes(getDiscoveryKey(e.discovery)),
				)
			: [];

		if (adapter) {
			for (const { discovery, fn } of toRemove) {
				adapter.off(discovery.getEvent(), fn);
			}
		}

		if (toKeep.length > 0) {
			this.bindings.set(key, toKeep);
		} else {
			this.bindings.delete(key);
		}

		return toRemove;
	}

	private async persistState(): Promise<void> {
		if (!this.options?.storage) return;
		const state = this.buildCurrentState();
		const json = JSON.stringify(state);
		if (json === this.lastSavedState) return;
		this.lastSavedState = json;
		await this.options.storage.save(state);
	}

	private buildCurrentState(): WebhookStorageState {
		// Every registered client gets a key, empty or not: the file doubles as
		// the template you edit by hand, and an absent client would look like a
		// typo. `__default__` is different — it is the bucket for bindings made
		// without a client, so it only appears once something is in it.
		const bindings: Record<string, string[]> = {};

		for (const name of this.registry.getNames()) {
			bindings[name] = [];
		}

		for (const [clientKey, entries] of this.bindings) {
			if (clientKey === DEFAULT_BINDING_KEY && entries.length === 0) continue;
			bindings[clientKey] = entries.map((e) => getDiscoveryKey(e.discovery));
		}

		return { bindings };
	}

	private async restoreState(): Promise<void> {
		if (!this.options?.storage) return;

		let raw: WebhookStorageState;
		try {
			raw = await this.options.storage.load();
		} catch (err) {
			this.warnOnce(
				"syntaxError",
				`Storage file has a syntax error — restore skipped: ${(err as Error).message}`,
			);
			return;
		}

		const discoveredByKey = new Map(
			this.webhookEventRegistry.getAll().map((d) => [getDiscoveryKey(d), d]),
		);

		let hasStale = false;
		const cleanBindings: Record<string, string[]> = {};

		for (const [clientKey, handlerKeys] of Object.entries(raw.bindings)) {
			const validKeys = handlerKeys.filter((k) => {
				if (discoveredByKey.has(k)) return true;
				this.warnOnce(
					"stale",
					`Stored handler key "${k}" not found among discovered handlers — removed from storage`,
				);
				hasStale = true;
				return false;
			});
			if (validKeys.length) cleanBindings[clientKey] = validKeys;
		}

		if (hasStale) {
			this.lastSavedState = JSON.stringify({
				bindings: cleanBindings,
			});
			await this.options.storage.save({
				bindings: cleanBindings,
			});
		}

		for (const [clientKey, handlerKeys] of Object.entries(cleanBindings)) {
			const clientName =
				clientKey === DEFAULT_BINDING_KEY ? undefined : clientKey;
			this.log(
				"restore",
				`Restoring ${handlerKeys.length} handler(s) for client "${clientName ?? "default"}"`,
			);
			this._bindHandlers(clientName, handlerKeys);
		}
	}

	private async syncFromState(newState: WebhookStorageState): Promise<void> {
		const discoveredKeys = new Set(
			this.webhookEventRegistry.getAll().map((d) => getDiscoveryKey(d)),
		);

		for (const [clientKey, newHandlerKeys] of Object.entries(
			newState.bindings,
		)) {
			const clientName =
				clientKey === DEFAULT_BINDING_KEY ? undefined : clientKey;
			const label = clientName ?? "default";
			const currentKeys = this.getBoundHandlers({ client: clientName });
			const validNewKeys = newHandlerKeys.filter((k) => discoveredKeys.has(k));

			const toAdd = validNewKeys.filter((k) => !currentKeys.includes(k));
			const toRemove = currentKeys.filter((k) => !validNewKeys.includes(k));

			if (toAdd.length) {
				const methods = toAdd.map((k) => k.split(".")[1] ?? k).join(", ");
				this.log(
					"fileChanged",
					`Storage changed — bound [${methods}] → client "${label}"`,
				);
				this._bindHandlers(clientName, toAdd);
			}

			if (toRemove.length) {
				const methods = toRemove.map((k) => k.split(".")[1] ?? k).join(", ");
				this.log(
					"fileChanged",
					`Storage changed — unbound [${methods}] → client "${label}"`,
				);
				this._unbindHandlers(clientName, toRemove);
			}
		}

		for (const [clientKey] of this.bindings) {
			if (!newState.bindings[clientKey]) {
				const clientName =
					clientKey === DEFAULT_BINDING_KEY ? undefined : clientKey;
				const label = clientName ?? "default";
				this.log(
					"fileChanged",
					`Storage changed — removed all bindings for client "${label}"`,
				);
				this._unbindHandlers(clientName);
			}
		}

		void this.persistState();
		this.notify();
	}

	private shouldLog(category: keyof NestWhatsWebhookLoggerOptions): boolean {
		const opt = this.options?.logger;
		if (opt === false) return false;
		if (opt === true || opt === undefined) return true;
		return (opt as NestWhatsWebhookLoggerOptions)[category] !== false;
	}

	private log(
		category: keyof NestWhatsWebhookLoggerOptions,
		message: string,
	): void {
		if (!this.shouldLog(category)) return;
		this.logger.log(message);
	}

	private warnOnce(category: "stale" | "syntaxError", message: string): void {
		if (!this.shouldLog(category)) return;

		const max =
			(this.options?.logger as NestWhatsWebhookLoggerOptions)
				?.maxWarningCount ?? 5;
		const count = (this.warnCount.get(category) ?? 0) + 1;
		this.warnCount.set(category, count);

		if (count > max) return;

		this.logger.warn(message);

		if (count === max) {
			this.logger.warn(
				`[${category}] Warning limit reached (${max}) — further warnings of this type will be suppressed`,
			);
		}
	}
}
