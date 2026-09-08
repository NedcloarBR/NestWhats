import type { NestWhatsExecutionContext } from "nestwhats";

/** What the interceptor already worked out, so a resolver need not repeat it. */
export interface LocaleResolverHints {
	/**
	 * The sender's country calling code, resolved once per message. Absent when
	 * there is no number to read — a LID, or a group.
	 */
	ddi?: string;
}

/**
 * Decides which locale a message should be answered in.
 *
 * Resolvers are tried in order and the first one to return a locale wins;
 * returning `undefined` passes the decision to the next.
 */
export interface LocaleResolver {
	resolve(
		context: NestWhatsExecutionContext,
		hints?: LocaleResolverHints,
	): string | undefined | Promise<string | undefined>;
}
