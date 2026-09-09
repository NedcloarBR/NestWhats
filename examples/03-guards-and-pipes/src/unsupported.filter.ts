import { ArgumentsHost, Catch } from "@nestjs/common";
import {
	CapabilityNotSupportedError,
	CommandContext,
	NestWhatsExceptionFilter,
	NestWhatsExecutionContext,
} from "nestwhats";

/**
 * Turns a refusal into a reply instead of a stack trace.
 *
 * `CapabilityNotSupportedError` carries the capability as a field, so the
 * message can name what this platform cannot do.
 */
@Catch(CapabilityNotSupportedError)
export class UnsupportedFilter implements NestWhatsExceptionFilter {
	public async catch(err: CapabilityNotSupportedError, host: ArgumentsHost) {
		const [, message] =
			NestWhatsExecutionContext.create(host).getContext<CommandContext>();

		await message.reply(`this platform cannot ${err.capability}`);
	}
}
