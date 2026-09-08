import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import {
	CommandContext,
	NestWhatsExecutionContext,
} from "../../context/index.js";

/** The client that received the message, for handlers bound to several. */
export const Client = createParamDecorator(
	(_: unknown, context: ExecutionContext) => {
		const ctx = NestWhatsExecutionContext.create(context);
		const [adapter] = ctx.getContext<CommandContext>();
		return adapter ?? null;
	},
);
