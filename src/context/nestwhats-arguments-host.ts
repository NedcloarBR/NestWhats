import { ArgumentsHost } from "@nestjs/common";
import { ExecutionContextHost } from "@nestjs/core/helpers/execution-context-host";
import { ClientEvents } from "../listeners";
import { NestWhatsBaseDiscovery } from "./nestwhats-base.discovery";
import { ContextOf } from "./nestwhats-context.interface";
import { NestWhatsContextType } from "./nestwhats-execution-context";

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

	public getContext<T extends keyof ClientEvents>(): ContextOf<T>;
	public getContext<T>(): T;
	public getContext<T extends keyof ClientEvents>(): ContextOf<T> {
		return this.getArgByIndex(0);
	}

	public getDiscovery(): NestWhatsBaseDiscovery {
		return this.getArgByIndex(1);
	}
}
