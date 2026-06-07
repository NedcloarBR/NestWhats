import {
	Inject,
	Injectable,
	Logger,
	OnApplicationBootstrap,
	OnApplicationShutdown,
	Optional,
} from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { ClientsRegistryService } from "nestwhats";
import { WebhookEventDiscovery } from "../discovery/webhook-event.discovery";
import type {
	NestWhatsMessagingLoggerOptions,
	NestWhatsMessagingOptions,
} from "../messaging-options.interface";
import {
	CLIENT_MANAGER_TOKEN,
	MESSAGING_OPTIONS,
} from "../messaging.constants";
import type { VirtualClientConfig, WebhookStorageState } from "../storage";
import { WebhookEventRegistryService } from "./webhook-event-registry.service";

interface BoundEntry {
	discovery: WebhookEventDiscovery;
	fn: (...args: unknown[]) => void;
}

export interface WebhookBindOptions {
	client?: string;
	handlers?: string[];
}

interface ClientManagerPort {
	createClient(options: VirtualClientConfig): Promise<void>;
	destroyClient(name: string): Promise<void>;
}

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
	private clientManager?: ClientManagerPort;
	private virtualClients: VirtualClientConfig[] = [];

	public constructor(
		private readonly registry: ClientsRegistryService,
		private readonly webhookEventRegistry: WebhookEventRegistryService,
		private readonly moduleRef: ModuleRef,
		@Optional()
		@Inject(MESSAGING_OPTIONS)
		private readonly options?: NestWhatsMessagingOptions,
	) {}

	public async onApplicationBootstrap(): Promise<void> {
		try {
			this.clientManager = this.moduleRef.get<ClientManagerPort>(
				CLIENT_MANAGER_TOKEN,
				{ strict: false },
			);
		} catch {
			// NestWhatsClientManagerService not available
		}

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
			key: d.getKey(),
			event: d.getEvent(),
			type: d.getType(),
		}));
	}

	public getBoundHandlers(options?: WebhookBindOptions): string[] {
		const key = options?.client ?? "__default__";
		return (this.bindings.get(key) ?? []).map((e) => e.discovery.getKey());
	}

	public register(options?: WebhookBindOptions): void {
		const clientName = options?.client;
		const filterKeys = options?.handlers;

		if (!filterKeys) {
			this._unbindHandlers(clientName);
		}

		const added = this._bindHandlers(clientName, filterKeys);

		for (const entry of added) {
			this.log(
				"bind",
				`Bound "${entry.discovery.getKey()}" (${entry.discovery.getEvent()}·${entry.discovery.getType()}) → client "${clientName ?? "default"}"`,
			);
		}

		void this.persistState();
		this.notify();
	}

	public unregister(options?: WebhookBindOptions): void {
		const clientName = options?.client;
		const filterKeys = options?.handlers;

		const removed = this._unbindHandlers(clientName, filterKeys);

		for (const entry of removed) {
			this.log(
				"unbind",
				`Unbound "${entry.discovery.getKey()}" (${entry.discovery.getEvent()}·${entry.discovery.getType()}) → client "${clientName ?? "default"}"`,
			);
		}

		void this.persistState();
		this.notify();
	}

	public async addVirtualClient(config: VirtualClientConfig): Promise<void> {
		if (!this.clientManager) {
			this.logger.warn(
				"NestWhatsClientManagerService not available — cannot create virtual client",
			);
			return;
		}
		await this.clientManager.createClient(config);
		if (!this.virtualClients.some((c) => c.name === config.name)) {
			this.virtualClients.push(config);
		}
		void this.persistState();
		this.notify();
	}

	public async removeVirtualClient(name: string): Promise<void> {
		if (!this.clientManager) {
			this.logger.warn(
				"NestWhatsClientManagerService not available — cannot destroy virtual client",
			);
			return;
		}
		await this.clientManager.destroyClient(name);
		this.virtualClients = this.virtualClients.filter((c) => c.name !== name);
		this.bindings.delete(name);
		void this.persistState();
		this.notify();
	}

	private _bindHandlers(
		clientName: string | undefined,
		filterKeys?: string[],
	): BoundEntry[] {
		const key = clientName ?? "__default__";
		const client = this.registry.get(clientName);
		if (!client) return [];

		const current = this.bindings.get(key) ?? [];
		const toAdd: BoundEntry[] = [];

		for (const discovery of this.webhookEventRegistry.getAll()) {
			if (filterKeys && !filterKeys.includes(discovery.getKey())) continue;

			const clients = discovery.getClients();
			if (clients && clientName && !clients.includes(clientName)) continue;

			if (current.some((e) => e.discovery === discovery)) continue;

			const fn = (...args: unknown[]) => discovery.execute([args]);
			(client as any)[discovery.getType()](discovery.getEvent(), fn);
			toAdd.push({ discovery, fn });
		}

		this.bindings.set(key, [...current, ...toAdd]);
		return toAdd;
	}

	private _unbindHandlers(
		clientName: string | undefined,
		filterKeys?: string[],
	): BoundEntry[] {
		const key = clientName ?? "__default__";
		const entries = this.bindings.get(key) ?? [];
		const client = this.registry.get(clientName);

		const toRemove = filterKeys
			? entries.filter((e) => filterKeys.includes(e.discovery.getKey()))
			: entries;
		const toKeep = filterKeys
			? entries.filter((e) => !filterKeys.includes(e.discovery.getKey()))
			: [];

		if (client) {
			for (const { discovery, fn } of toRemove) {
				(client as any).off(discovery.getEvent(), fn);
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
		const bindings: Record<string, string[]> = {};

		for (const name of this.registry.getNames()) {
			bindings[name] = [];
		}
		bindings.__default__ = [];

		for (const [clientKey, entries] of this.bindings) {
			bindings[clientKey] = entries.map((e) => e.discovery.getKey());
		}

		return {
			bindings,
			virtualClients:
				this.virtualClients.length > 0 ? this.virtualClients : undefined,
		};
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

		if (raw.virtualClients?.length && this.clientManager) {
			for (const vc of raw.virtualClients) {
				await this.clientManager.createClient(vc);
				this.virtualClients.push(vc);
			}
		}

		const discoveredByKey = new Map(
			this.webhookEventRegistry.getAll().map((d) => [d.getKey(), d]),
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
				virtualClients: raw.virtualClients,
			});
			await this.options.storage.save({
				bindings: cleanBindings,
				virtualClients: raw.virtualClients,
			});
		}

		for (const [clientKey, handlerKeys] of Object.entries(cleanBindings)) {
			const clientName = clientKey === "__default__" ? undefined : clientKey;
			this.log(
				"restore",
				`Restoring ${handlerKeys.length} handler(s) for client "${clientName ?? "default"}"`,
			);
			this._bindHandlers(clientName, handlerKeys);
		}
	}

	private async syncFromState(newState: WebhookStorageState): Promise<void> {
		const discoveredKeys = new Set(
			this.webhookEventRegistry.getAll().map((d) => d.getKey()),
		);

		for (const [clientKey, newHandlerKeys] of Object.entries(
			newState.bindings,
		)) {
			const clientName = clientKey === "__default__" ? undefined : clientKey;
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
				const clientName = clientKey === "__default__" ? undefined : clientKey;
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

	private shouldLog(category: keyof NestWhatsMessagingLoggerOptions): boolean {
		const opt = this.options?.logger;
		if (opt === false) return false;
		if (opt === true || opt === undefined) return true;
		return (opt as NestWhatsMessagingLoggerOptions)[category] !== false;
	}

	private log(
		category: keyof NestWhatsMessagingLoggerOptions,
		message: string,
	): void {
		if (!this.shouldLog(category)) return;
		this.logger.log(message);
	}

	private warnOnce(category: "stale" | "syntaxError", message: string): void {
		if (!this.shouldLog(category)) return;

		const max =
			(this.options?.logger as NestWhatsMessagingLoggerOptions)
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
