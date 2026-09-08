import { ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { CommandContext, NestWhatsExecutionContext } from "../context/index.js";
import { isGroupJid } from "../structures/index.js";
import { NestWhatsGuard } from "./guard.interface.js";

/**
 * Allows the handler only for group admins.
 *
 * Denies on a platform that cannot list participants — and says so once in the
 * log, since that is not the same answer as "not an admin".
 */
@Injectable()
export class IsAdminGuard implements NestWhatsGuard {
	private readonly logger = new Logger(IsAdminGuard.name);
	private warned = false;

	public async canActivate(rawCtx: ExecutionContext): Promise<boolean> {
		const ctx = NestWhatsExecutionContext.create(rawCtx);
		const [, message] = ctx.getContext<CommandContext>();
		if (!isGroupJid(message.chatId)) return false;

		const chat = await message.getChat?.();
		const participants = await chat?.getParticipants?.();
		// Denying is the safe answer, but it is not the same as "not an admin":
		// the platform cannot say. Say so once, or the guard looks broken.
		if (!participants) {
			if (!this.warned) {
				this.warned = true;
				this.logger.warn(
					"This adapter cannot list group participants, so IsAdminGuard denies every command it protects",
				);
			}
			return false;
		}

		return participants.some((p) => p.id === message.senderId && p.isAdmin);
	}
}
