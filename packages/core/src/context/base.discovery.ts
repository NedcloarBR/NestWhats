import { Reflector } from "@nestjs/core";
import type { NestWhatsClient } from "../client/client.js";
import { CommandDiscovery } from "../commands/command.discovery.js";
import { SubcommandDiscovery } from "../commands/subcommand.discovery.js";
import { ListenerDiscovery } from "../listeners/index.js";

interface DiscoveredItem {
	class: any;
	handler?: (...args: any[]) => any;
}

/**
 * Base for everything the explorer discovers — commands, subcommands and
 * listeners. Holds the declared metadata and the wiring needed to invoke the
 * handler with NestJS' guards, pipes and filters applied.
 */
export abstract class NestWhatsBaseDiscovery<T = any> {
	protected readonly reflector = new Reflector();

	protected discovery?: DiscoveredItem;

	protected contextCallback?: Function;

	public constructor(protected readonly meta: T) {}

	public getClass() {
		return this.discovery?.class;
	}

	public getHandler() {
		return this.discovery?.handler;
	}

	public setDiscoveryMeta(meta: DiscoveredItem) {
		this.discovery ??= meta;
	}

	public setContextCallback(fn: Function) {
		this.contextCallback ??= fn;
	}

	public execute(eventArgs: any = [], client?: NestWhatsClient) {
		if (!this.contextCallback) {
			throw new Error(
				"[NestWhats] Handler executed before the explorer wired its context callback",
			);
		}
		const context = client ? [client, ...eventArgs] : eventArgs;
		return this.contextCallback(context, this);
	}

	public isListener(): this is ListenerDiscovery {
		return false;
	}

	public isCommand(): this is CommandDiscovery {
		return false;
	}

	public isSubcommand(): this is SubcommandDiscovery {
		return false;
	}

	public abstract toJSON(): Record<string, any>;
}
