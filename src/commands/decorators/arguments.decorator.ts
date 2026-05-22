import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { CommandContext, NestWhatsExecutionContext } from "../../context";

export const Arguments = createParamDecorator(
	(index: number | undefined, context: ExecutionContext) => {
		const moduleContext = NestWhatsExecutionContext.create(context);
		const [message] = moduleContext.getContext<CommandContext>();
		const discovery = moduleContext.getDiscovery();

		if (!discovery.isCommand()) return null;

		const args = message.body.split(/ +/g).slice(1);
		return index !== undefined ? (args[index] ?? null) : args;
	},
);

export const Args = Arguments;
