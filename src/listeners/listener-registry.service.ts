import { Injectable } from "@nestjs/common";
import { ListenerDiscovery } from "./listener.discovery";

@Injectable()
export class ListenerRegistryService {
	private listeners: ListenerDiscovery[] = [];

	public set(listeners: ListenerDiscovery[]): void {
		this.listeners = listeners;
	}

	public getAll(): ListenerDiscovery[] {
		return this.listeners;
	}
}
