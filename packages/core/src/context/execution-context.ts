import { ContextType, ExecutionContext } from "@nestjs/common";
import { NestWhatsArgumentsHost } from "./arguments-host.js";

/** The context type NestWhats registers with NestJS: `"nestwhats"`. */
export type NestWhatsContextType = "nestwhats" | ContextType;

/**
 * The `ExecutionContext` guards, interceptors and filters receive.
 *
 * `create(context)` narrows a plain NestJS context to this one; `getContext()`
 * returns the event arguments, typed by the event.
 */
export class NestWhatsExecutionContext extends NestWhatsArgumentsHost {
	public static create(context: ExecutionContext): NestWhatsExecutionContext {
		const type = context.getType();
		const moduleContext = new NestWhatsExecutionContext(
			context.getArgs(),
			context.getClass(),
			context.getHandler(),
		);
		moduleContext.setType(type);
		return moduleContext;
	}
}
