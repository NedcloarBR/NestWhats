import { ExecutionContext, Injectable } from "@nestjs/common";
import {
	CommandContext,
	NestWhatsExecutionContext,
	NestWhatsGuard,
} from "nestwhats";

/**
 * A guard of your own.
 *
 * `NestWhatsExecutionContext.create()` is what turns Nest's generic context
 * into the `[client, message]` tuple.
 */
@Injectable()
export class BusinessHoursGuard implements NestWhatsGuard {
	public async canActivate(rawCtx: ExecutionContext): Promise<boolean> {
		const ctx = NestWhatsExecutionContext.create(rawCtx);
		const [, message] = ctx.getContext<CommandContext>();

		const hour = new Date(message.timestamp).getHours();
		return hour >= 9 && hour < 18;
	}
}
