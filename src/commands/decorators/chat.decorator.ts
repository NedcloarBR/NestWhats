import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { CommandContext, NestWhatsExecutionContext } from "../../context";

export const Chat = createParamDecorator(
	async (_: unknown, context: ExecutionContext) => {
		const ctx = NestWhatsExecutionContext.create(context);
		const [message] = ctx.getContext<CommandContext>();
		return message?.getChat() ?? null;
	},
);
