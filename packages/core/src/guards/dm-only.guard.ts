import { ExecutionContext, Injectable } from "@nestjs/common";
import { CommandContext, NestWhatsExecutionContext } from "../context/index.js";
import { isGroupJid } from "../structures/index.js";
import { NestWhatsGuard } from "./guard.interface.js";

/** Allows the handler only in direct messages. */
@Injectable()
export class DmOnlyGuard implements NestWhatsGuard {
	public async canActivate(rawCtx: ExecutionContext): Promise<boolean> {
		const ctx = NestWhatsExecutionContext.create(rawCtx);
		const [, message] = ctx.getContext<CommandContext>();
		return !isGroupJid(message.chatId);
	}
}
