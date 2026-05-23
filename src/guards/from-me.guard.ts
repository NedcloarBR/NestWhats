import { ExecutionContext, Injectable } from "@nestjs/common";
import { CommandContext, NestWhatsExecutionContext } from "../context";
import { NestWhatsGuard } from "./nestwhats-guard.interface";

@Injectable()
export class FromMeGuard implements NestWhatsGuard {
	public canActivate(rawCtx: ExecutionContext): boolean {
		const ctx = NestWhatsExecutionContext.create(rawCtx);
		const [message] = ctx.getContext<CommandContext>();
		return message.fromMe;
	}
}
