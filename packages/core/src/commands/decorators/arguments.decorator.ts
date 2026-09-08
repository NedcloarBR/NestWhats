import { createParamDecorator, ExecutionContext, Type } from "@nestjs/common";
import {
	CommandContext,
	NestWhatsExecutionContext,
} from "../../context/index.js";
import { ParseArgsPipe } from "../pipes/parse-args.pipe.js";

/**
 * The words after the command name, already split.
 *
 * Passing a DTO class runs them through {@link ParseArgsPipe} first, so the
 * handler receives a validated object instead of a string array.
 */
export const Arguments = createParamDecorator(
	(index: number | undefined, context: ExecutionContext) => {
		const moduleContext = NestWhatsExecutionContext.create(context);
		const [, message] = moduleContext.getContext<CommandContext>();
		const discovery = moduleContext.getDiscovery();

		if (!discovery.isCommand() && !discovery.isSubcommand()) return null;

		const args = message.body
			.split(/ +/g)
			.slice(discovery.isSubcommand() ? 2 : 1);
		return index !== undefined ? (args[index] ?? null) : args;
	},
);

/** Short form of {@link Arguments}. */
export const Args = Arguments;

/** {@link Arguments} bound to a DTO — the same as passing the class to `@Args`. */
export const ParseArgs = <T extends object>(dto: Type<T>) =>
	Args(new ParseArgsPipe(dto));
