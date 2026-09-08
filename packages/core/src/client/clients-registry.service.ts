import { Injectable, InjectionToken, Logger } from "@nestjs/common";
import type {
	NestWhatsAdapter,
	NestWhatsAdapterInfo,
} from "../adapter/adapter.interface.js";
import type { AdapterCapability, AdapterPlatform } from "../adapter/index.js";
import { ClientStatus, getCapabilities } from "../adapter/index.js";
import { NESTWHATS_DEFAULT_NAME } from "../module/module-options.interface.js";
import type { NestWhatsClient } from "./client.js";
import { getClientToken } from "./client-token.util.js";

/** A client's public state — what a dashboard or a health check reads. */
export interface ClientSummary {
	/** How the client is named and injected. */
	name: string;
	/** Command prefix in force right now; editable at runtime. */
	prefix: string;
	status: ClientStatus;
	/** Epoch milliseconds of the last status change. */
	statusAt: number;
	/** QR payload to render, while the client is waiting to be scanned. */
	qr?: string;
	/** Pairing code, when the client authenticates by phone pairing. */
	pairingCode?: string;
	/** Who is connected, once the platform can say. */
	info?: NestWhatsAdapterInfo;
	/**
	 * Which platform backs this client; comes from the factory, not the
	 * connection, so it is known before the client is up.
	 */
	platform?: AdapterPlatform;
	/**
	 * What this client's adapter can do, derived from the methods it implements.
	 * Known before it connects, for the same reason `platform` is.
	 */
	capabilities: AdapterCapability[];
	/** Created at runtime rather than declared in the module. */
	virtual?: boolean;
}

/** A registered client: its summary plus the adapter and client objects. */
export interface ClientEntry {
	/** How the client is named and injected. */
	name: string;
	/** The adapter its factory built for this client. */
	adapter: NestWhatsAdapter;
	/**
	 * Which platform backs this client, taken from the factory at registration
	 * — so it is known before the adapter connects, and stays known if it drops.
	 */
	platform?: AdapterPlatform;
	/** The injectable client object, carrying the derived events. */
	client: NestWhatsClient;
	/** Command prefix in force right now; editable at runtime. */
	prefix: string;
	status: ClientStatus;
	/** Epoch milliseconds of the last status change. */
	statusAt: number;
	/** QR payload to render, while the client is waiting to be scanned. */
	qr?: string;
	/** Pairing code, when the client authenticates by phone pairing. */
	pairingCode?: string;
	/** Who is connected, once the platform can say. */
	info?: NestWhatsAdapterInfo;
	/** Created at runtime rather than declared in the module. */
	virtual?: boolean;
}

/**
 * The live state of every client — declared in code or created at runtime.
 *
 * Updated the moment an adapter reports a change, before any debounce, so a
 * dashboard shows a drop as it happens. Subscribe with `onChange` to be told.
 */
@Injectable()
export class ClientsRegistryService {
	private readonly logger = new Logger(ClientsRegistryService.name);
	private readonly registry = new Map<InjectionToken, ClientEntry>();
	private readonly changeListeners = new Set<() => void>();

	/** Registers a client. Declared clients arrive at module init, virtual ones at creation. */
	public add(entry: Omit<ClientEntry, "status" | "qr" | "statusAt">): void {
		const token = getClientToken(entry.name);

		if (this.registry.has(token)) {
			this.logger.warn(
				`Client "${entry.name}" is already registered and will be overwritten`,
			);
		}

		this.registry.set(token, {
			...entry,
			status: ClientStatus.Initializing,
			statusAt: Date.now(),
		});
	}

	/**
	 * Records a status change and whatever the client is waiting to be
	 * authenticated with — a QR payload, or a pairing code. Both are cleared
	 * when none is passed, which is what happens once the client is ready.
	 */
	public updateStatus(
		name: string,
		status: ClientStatus,
		credential?: { qr?: string; pairingCode?: string },
	): void {
		const token = getClientToken(name);
		const entry = this.registry.get(token);
		if (!entry) return;
		entry.status = status;
		entry.statusAt = Date.now();
		entry.qr = credential?.qr;
		entry.pairingCode = credential?.pairingCode;
		this.notify();
	}

	/** Changes the command prefix for a live client; the next message uses it. */
	public updatePrefix(name: string, prefix: string): void {
		const entry = this.registry.get(getClientToken(name));
		if (!entry) return;
		entry.prefix = prefix;
		this.notify();
	}

	/** Records who is connected, once the adapter can say. */
	public updateInfo(name: string, info: NestWhatsAdapterInfo): void {
		const token = getClientToken(name);
		const entry = this.registry.get(token);
		if (!entry) return;
		entry.info = info;
		this.notify();
	}

	/**
	 * Notifies on every change to any client. Returns the function that stops it.
	 *
	 * This is how the dashboard stays live without polling.
	 */
	public subscribe(fn: () => void): () => void {
		this.changeListeners.add(fn);
		return () => this.changeListeners.delete(fn);
	}

	private notify(): void {
		for (const fn of this.changeListeners) fn();
	}

	/**
	 * No name: resolves to the single registered client, or the one named
	 * "default" when there are several.
	 */
	private resolveEntry(name?: string): ClientEntry | undefined {
		if (name !== undefined) return this.registry.get(getClientToken(name));
		if (this.registry.size === 1) return [...this.registry.values()][0];
		return this.registry.get(getClientToken(NESTWHATS_DEFAULT_NAME));
	}

	/** The adapter of a named client, or of the default one. */
	public get(name?: string): NestWhatsAdapter | undefined {
		return this.resolveEntry(name)?.adapter;
	}

	/** The injectable client object, or of the default one. */
	public getClient(name?: string): NestWhatsClient | undefined {
		return this.resolveEntry(name)?.client;
	}

	/** Everything known about a client, or about the default one. */
	public getEntry(name?: string): ClientEntry | undefined {
		return this.resolveEntry(name);
	}

	/** Every registered client, declared and virtual. */
	public getAll(): ClientEntry[] {
		return [...this.registry.values()];
	}

	/** Clients currently in a given status. */
	public getByStatus(status: ClientStatus): ClientEntry[] {
		return [...this.registry.values()].filter((e) => e.status === status);
	}

	/** Names of every registered client. */
	public getNames(): string[] {
		return [...this.registry.values()].map((entry) => entry.name);
	}

	/** Drops a client from the registry. Does not stop it — the caller does that. */
	public remove(name: string): void {
		this.registry.delete(getClientToken(name));
		this.notify();
	}

	public getSummary(): ClientSummary[] {
		return [...this.registry.values()].map(
			({
				name,
				prefix,
				status,
				statusAt,
				qr,
				pairingCode,
				info,
				platform,
				adapter,
				virtual: v,
			}) => ({
				name,
				prefix,
				status,
				statusAt,
				qr,
				pairingCode,
				info,
				// Comes from the factory at registration, so the badge is right from
				// the first render — long before the client connects.
				platform,
				// Read per call rather than cached: an adapter whose `unsupported`
				// depends on how the account was onboarded can only answer once it
				// knows, which may be after registration.
				capabilities: getCapabilities(adapter),
				virtual: v,
			}),
		);
	}
}
