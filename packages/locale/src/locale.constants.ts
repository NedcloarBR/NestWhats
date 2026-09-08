/** Injection token for the configured {@link BaseLocaleAdapter}. */
export const LOCALE_ADAPTER = Symbol.for("NESTWHATS::LOCALE_ADAPTER");
/** Injection token for the configured resolvers, in the order they run. */
export const LOCALE_RESOLVERS = Symbol.for("NESTWHATS::LOCALE_RESOLVERS");
/** Injection token holding the resolved {@link NestWhatsLocaleOptions}. */
export const LOCALE_OPTIONS = Symbol.for("NESTWHATS::LOCALE_OPTIONS");
