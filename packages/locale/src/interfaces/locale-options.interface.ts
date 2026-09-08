import type { BaseLocaleAdapter } from "../adapters/base-locale.adapter.js";
import type { LocaleResolver } from "./locale-resolver.interface.js";

/** Translates a key, with optional placeholder values. */
export type TranslationFn = (key: string, ...args: any[]) => string;

/** Options for `NestWhatsLocaleModule.forRoot`. */
export interface NestWhatsLocaleOptions {
	adapter: BaseLocaleAdapter;
	resolvers: LocaleResolver | LocaleResolver[];
}
