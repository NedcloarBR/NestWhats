import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import {
	CommandContext,
	NestWhatsExecutionContext,
} from "../../context/index.js";

/** The incoming message. */
export const Message = createParamDecorator(
	(_: unknown, context: ExecutionContext) => {
		const ctx = NestWhatsExecutionContext.create(context);
		const [, message] = ctx.getContext<CommandContext>();
		return message ?? null;
	},
);

/** Short form of {@link Message}. */
export const Msg = Message;
