import { ArgumentsHost } from "@nestjs/common";
import { ExecutionContextHost } from "@nestjs/core/helpers/execution-context-host";
import type { NestWhatsEvents } from "../listeners/index.js";
import { NestWhatsBaseDiscovery } from "./base.discovery.js";
import { ContextOf } from "./context.interface.js";
import { NestWhatsContextType } from "./execution-context.js";

/** `ArgumentsHost` for the `nestwhats` context, so filters can reach the event. */
export class NestWhatsArgumentsHost extends ExecutionContextHost {
	public static create(context: ArgumentsHost): NestWhatsArgumentsHost {
		const type = context.getType();
		const necContext = new NestWhatsArgumentsHost(context.getArgs());
		necContext.setType(type);
		return necContext;
	}

	public getType<TContext extends string = NestWhatsContextType>(): TContext {
		return super.getType();
	}

	public getContext<T extends keyof NestWhatsEvents>(): ContextOf<T>;
	public getContext<T>(): T;
	public getContext<T extends keyof NestWhatsEvents>(): ContextOf<T> {
		return this.getArgByIndex(0);
	}

	public getDiscovery(): NestWhatsBaseDiscovery {
		return this.getArgByIndex(1);
	}
}
