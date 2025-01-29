import { ContextType, ExecutionContext } from "@nestjs/common";
import { NestWhatsArgumentsHost } from "./nestwhats-arguments-host";

export type NestWhatsContextType = "nestwhats" | ContextType;

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
