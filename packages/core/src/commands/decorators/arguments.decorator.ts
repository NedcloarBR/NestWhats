import { ExecutionContext, Type, createParamDecorator } from "@nestjs/common";
import { CommandContext, NestWhatsExecutionContext } from "../../context";
import { ParseArgsPipe } from "../pipes/parse-args.pipe";

export const Arguments = createParamDecorator(
	(index: number | undefined, context: ExecutionContext) => {
		const moduleContext = NestWhatsExecutionContext.create(context);
		const [message] = moduleContext.getContext<CommandContext>();
		const discovery = moduleContext.getDiscovery();

		if (!discovery.isCommand() && !discovery.isSubcommand()) return null;

		const args = message.body
			.split(/ +/g)
			.slice(discovery.isSubcommand() ? 2 : 1);
		return index !== undefined ? (args[index] ?? null) : args;
	},
);

export const Args = Arguments;

export const ParseArgs = <T extends object>(dto: Type<T>) =>
	Args(new ParseArgsPipe(dto));
