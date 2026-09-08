import type { BaseLocaleLoader } from "../loaders/base-locale.loader.js";
import { BaseLocaleAdapter } from "./base-locale.adapter.js";

type TranslationData = Record<string, any>;

/** Options for {@link NestedLocaleAdapter}. */
export interface NestedLocaleAdapterOptions {
	/**
	 * Used when the requested locale has no entry for the key. Defaults to
	 * `en-US`.
	 */
	fallbackLocale?: string;
	locales?: Record<string, TranslationData> | BaseLocaleLoader;
}

/**
 * Nested catalogue: `commands.hello` walks into `{ commands: { hello } }`,
 * which is how most translation files are written. Placeholders are
 * `{{ name }}`.
 */
export class NestedLocaleAdapter extends BaseLocaleAdapter<NestedLocaleAdapterOptions> {
	public getTranslation(
		key: string,
		locale: string,
		placeholders?: Record<string, string>,
	): string {
		const translations = this._locales[locale] ?? {};
		const translation =
			this.findTranslation(translations, key) ??
			this.getFallbackTranslation(key);

		return translation.replace(
			/{{\s*([^}\s]+)\s*}}/g,
			(_, placeholder) => placeholders?.[placeholder] ?? "",
		);
	}

	private findTranslation(
		translations: TranslationData,
		key: string,
	): string | undefined {
		const keys = key.split(".");
		let current: string | TranslationData = translations;

		for (const k of keys) {
			if (!(typeof current === "object" && k in current)) return undefined;
			current = current[k];
		}

		return typeof current === "string" ? current : undefined;
	}

	private getFallbackTranslation(key: string): string {
		const fallback = this.options?.fallbackLocale ?? "en-US";
		return this.findTranslation(this._locales[fallback] ?? {}, key) ?? key;
	}
}
