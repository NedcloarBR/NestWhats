import type { NestWhatsExecutionContext, NestWhatsMessage } from "nestwhats";
import { DDI_LOCALE } from "../constants/phone-ddi.js";
import type {
	LocaleResolver,
	LocaleResolverHints,
} from "../interfaces/locale-resolver.interface.js";
import { ddiOfMessage } from "../phone.util.js";

/**
 * Resolves the locale from the sender's country calling code.
 *
 * The interceptor resolves that code once per message and passes it in, so
 * this normally costs nothing. The fallback path exists for a resolver used
 * outside that interceptor.
 */
export class PhoneCountryResolver implements LocaleResolver {
	public async resolve(
		context: NestWhatsExecutionContext,
		hints?: LocaleResolverHints,
	): Promise<string | undefined> {
		const ddi = hints?.ddi ?? (await this.extractDdi(context));
		return ddi ? DDI_LOCALE[ddi] : undefined;
	}

	private async extractDdi(
		context: NestWhatsExecutionContext,
	): Promise<string | undefined> {
		const args = context.getContext<"message">();
		if (!Array.isArray(args)) return undefined;
		// Context shape: [NestWhatsClient, message, ...]
		return ddiOfMessage(args[1] as NestWhatsMessage | undefined);
	}
}
