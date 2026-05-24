import { ExecutionContext, Injectable } from "@nestjs/common";
import { CommandContext, NestWhatsExecutionContext } from "../context";
import { NestWhatsGuard } from "./nestwhats-guard.interface";

@Injectable()
export class GroupOnlyGuard implements NestWhatsGuard {
	public async canActivate(rawCtx: ExecutionContext): Promise<boolean> {
		const ctx = NestWhatsExecutionContext.create(rawCtx);
		const [message] = ctx.getContext<CommandContext>();
		const chat = await message.getChat();
		return chat.isGroup;
	}
}
