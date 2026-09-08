import { ExecutionContext, Injectable } from "@nestjs/common";
import { CommandContext, NestWhatsExecutionContext } from "../context/index.js";
import { NestWhatsGuard } from "./guard.interface.js";

/**
 * Allows the handler only for messages the client itself sent — a command you
 * type from your own phone.
 *
 * Requires the client to receive its own messages, so leave `ignoreSelf` off.
 */
@Injectable()
export class FromMeGuard implements NestWhatsGuard {
	public canActivate(rawCtx: ExecutionContext): boolean {
		const ctx = NestWhatsExecutionContext.create(rawCtx);
		const [, message] = ctx.getContext<CommandContext>();
		return message.fromMe;
	}
}
