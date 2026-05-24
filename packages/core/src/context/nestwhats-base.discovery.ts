import { Reflector } from "@nestjs/core";
import { CommandDiscovery } from "../commands/command.discovery";
import { ListenerDiscovery } from "../listeners";

interface DiscoveredItem {
	class: any;
	handler?: (...args: any[]) => any;
}

export abstract class NestWhatsBaseDiscovery<T = any> {
	protected readonly reflector = new Reflector();

	protected discovery: DiscoveredItem;

	protected contextCallback: Function;

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

	public execute(context: any = []) {
		return this.contextCallback(context, this);
	}

	public isListener(): this is ListenerDiscovery {
		return false;
	}

	public isCommand(): this is CommandDiscovery {
		return false;
	}

	public abstract toJSON(): Record<string, any>;
}
