import type { BaseLocaleLoader } from "../loaders/base-locale.loader";
import { BaseLocaleAdapter } from "./base-locale.adapter";

export interface DefaultLocaleAdapterOptions {
	fallbackLocale?: string;
	locales?: Record<string, Record<string, string>> | BaseLocaleLoader;
}

export class DefaultLocaleAdapter extends BaseLocaleAdapter<DefaultLocaleAdapterOptions> {
	public getTranslation(
		key: string,
		locale: string,
		placeholders?: Record<string, string>,
	): string {
		const translations = (this._locales[locale] ?? {}) as Record<string, string>;
		const translation = translations[key] ?? this.getFallbackTranslation(key);

		return translation.replace(
			/{{\s*([^}\s]+)\s*}}/g,
			(_, placeholder) => placeholders?.[placeholder] ?? "",
		);
	}

	private getFallbackTranslation(key: string): string {
		const fallback = this.options?.fallbackLocale ?? "en-US";
		return (this._locales[fallback] as Record<string, string>)?.[key] ?? key;
	}
}
