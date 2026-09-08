import { ExecutionContext, Injectable } from "@nestjs/common";
import { CommandContext, NestWhatsExecutionContext } from "../context/index.js";
import { isGroupJid } from "../structures/index.js";
import { NestWhatsGuard } from "./guard.interface.js";

/** Allows the handler only in group chats. */
@Injectable()
export class GroupOnlyGuard implements NestWhatsGuard {
	public async canActivate(rawCtx: ExecutionContext): Promise<boolean> {
		const ctx = NestWhatsExecutionContext.create(rawCtx);
		const [, message] = ctx.getContext<CommandContext>();
		// The id already says it, so this works on platforms that cannot fetch a
		// chat at all — and costs no round trip on the ones that can.
		return isGroupJid(message.chatId);
	}
}
