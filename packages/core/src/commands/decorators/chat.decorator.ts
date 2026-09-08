import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import {
	CommandContext,
	NestWhatsExecutionContext,
} from "../../context/index.js";

/**
 * The chat the message came from, or `null` on a platform that cannot fetch one.
 */
export const Chat = createParamDecorator(
	async (_: unknown, context: ExecutionContext) => {
		const ctx = NestWhatsExecutionContext.create(context);
		const [, message] = ctx.getContext<CommandContext>();
		// Platforms without a chat lookup hand the handler null rather than
		// failing the command.
		return (await message?.getChat?.()) ?? null;
	},
);
