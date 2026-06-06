import type { NestWhatsExecutionContext } from "nestwhats";

export interface LocaleResolver {
	resolve(
		context: NestWhatsExecutionContext,
	): string | undefined | Promise<string | undefined>;
}
