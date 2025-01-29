import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { CommandContext, NestWhatsExecutionContext } from "../../context";

export const Arguments = createParamDecorator(
	(_, context: ExecutionContext) => {
		const moduleContext = NestWhatsExecutionContext.create(context);
		const [message] = moduleContext.getContext<CommandContext>();
		const discovery = moduleContext.getDiscovery();

		if (!discovery.isCommand()) return null;

		return message.body.split(/ +/g).slice(1);
	},
);

export const Args = Arguments;
