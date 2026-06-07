import { Injectable, InjectionToken, Logger } from "@nestjs/common";
import { Client } from "whatsapp-web.js";
import { getClientToken } from "./providers/client-token.util";

export enum ClientStatus {
	Initializing = "initializing",
	QrReceived = "qr_received",
	Authenticated = "authenticated",
	Ready = "ready",
	Disconnected = "disconnected",
}

export interface ClientSummary {
	name: string;
	prefix: string;
	status: ClientStatus;
	statusAt: number;
	qr?: string;
	pushname?: string;
	phone?: string;
	virtual?: boolean;
}

export interface ClientEntry {
	name: string;
	client: Client;
	prefix: string;
	status: ClientStatus;
	statusAt: number;
	qr?: string;
	pushname?: string;
	phone?: string;
	virtual?: boolean;
}

@Injectable()
export class ClientsRegistryService {
	private readonly logger = new Logger(ClientsRegistryService.name);
	private readonly registry = new Map<InjectionToken, ClientEntry>();
	private readonly changeListeners = new Set<() => void>();

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

	public updateStatus(name: string, status: ClientStatus, qr?: string): void {
		const token = getClientToken(name);
		const entry = this.registry.get(token);
		if (!entry) return;
		entry.status = status;
		entry.statusAt = Date.now();
		entry.qr = qr;
		this.notify();
	}

	public updateInfo(name: string, pushname: string, phone: string): void {
		const token = getClientToken(name);
		const entry = this.registry.get(token);
		if (!entry) return;
		entry.pushname = pushname;
		entry.phone = phone;
		this.notify();
	}

	public subscribe(fn: () => void): () => void {
		this.changeListeners.add(fn);
		return () => this.changeListeners.delete(fn);
	}

	private notify(): void {
		for (const fn of this.changeListeners) fn();
	}

	public get(name?: string): Client | undefined {
		return this.registry.get(getClientToken(name))?.client;
	}

	public getEntry(name?: string): ClientEntry | undefined {
		return this.registry.get(getClientToken(name));
	}

	public getAll(): ClientEntry[] {
		return [...this.registry.values()];
	}

	public getByStatus(status: ClientStatus): ClientEntry[] {
		return [...this.registry.values()].filter((e) => e.status === status);
	}

	public getNames(): string[] {
		return [...this.registry.values()].map((entry) => entry.name);
	}

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
				pushname,
				phone,
				virtual: v,
			}) => ({
				name,
				prefix,
				status,
				statusAt,
				qr,
				pushname,
				phone,
				virtual: v,
			}),
		);
	}
}
