import type { BaseLocaleAdapter } from "../adapters/base-locale.adapter";
import type { LocaleResolver } from "./locale-resolver.interface";

export type TranslationFn = (key: string, ...args: any[]) => string;

export interface NestWhatsLocaleOptions {
	adapter: BaseLocaleAdapter;
	resolvers: LocaleResolver | LocaleResolver[];
}
