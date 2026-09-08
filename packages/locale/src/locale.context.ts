import { AsyncLocalStorage } from "node:async_hooks";
import type { TranslationFn } from "./interfaces/locale-options.interface.js";

/** What is known about the message being handled, once the resolvers have run. */
export interface LocaleContext {
	/** Translates a key into the resolved locale. */
	translate: TranslationFn;
	/** The locale that won, or the fallback. */
	locale: string;
	/** The sender's country calling code, when there is a number to read. */
	ddi?: string;
}

/**
 * Carries the resolved locale for the message being handled.
 *
 * Async storage rather than a parameter, so the decorators can reach it from
 * anywhere in the call, including services the handler delegates to.
 */
export const LocaleStorage = new AsyncLocalStorage<LocaleContext>();
