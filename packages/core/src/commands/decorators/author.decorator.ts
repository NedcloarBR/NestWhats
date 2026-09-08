import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import {
	CommandContext,
	NestWhatsExecutionContext,
} from "../../context/index.js";

/** The contact who sent the message, or `null` if the platform cannot resolve it. */
export const Author = createParamDecorator(
	(_: unknown, context: ExecutionContext) => {
		const ctx = NestWhatsExecutionContext.create(context);
		const [, message] = ctx.getContext<CommandContext>();
		return message?.senderId ?? null;
	},
);
