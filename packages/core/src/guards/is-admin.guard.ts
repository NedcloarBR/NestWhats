import { ExecutionContext, Injectable } from "@nestjs/common";
import { GroupChat } from "whatsapp-web.js";
import { CommandContext, NestWhatsExecutionContext } from "../context";
import { NestWhatsGuard } from "./nestwhats-guard.interface";

@Injectable()
export class IsAdminGuard implements NestWhatsGuard {
	public async canActivate(rawCtx: ExecutionContext): Promise<boolean> {
		const ctx = NestWhatsExecutionContext.create(rawCtx);
		const [message] = ctx.getContext<CommandContext>();
		const chat = await message.getChat();
		if (!chat.isGroup) return false;
		const contact = await message.getContact();
		const participant = (chat as GroupChat).participants.find(
			(p) => p.id._serialized === contact.id._serialized,
		);
		return participant?.isAdmin ?? false;
	}
}
