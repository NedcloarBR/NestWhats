import type { BaseLocaleLoader } from "../loaders/base-locale.loader.js";
import { BaseLocaleAdapter } from "./base-locale.adapter.js";

/** Options for {@link DefaultLocaleAdapter}. */
export interface DefaultLocaleAdapterOptions {
	/**
	 * Used when the requested locale has no entry for the key. Defaults to
	 * `en-US`.
	 */
	fallbackLocale?: string;
	locales?: Record<string, Record<string, string>> | BaseLocaleLoader;
}

/**
 * Flat catalogue: keys are used verbatim, so `commands.hello` is a literal key
 * rather than a path. Placeholders are `{{ name }}`.
 *
 * Use {@link NestedLocaleAdapter} when the files are nested objects.
 */
export class DefaultLocaleAdapter extends BaseLocaleAdapter<DefaultLocaleAdapterOptions> {
	public getTranslation(
		key: string,
		locale: string,
		placeholders?: Record<string, string>,
	): string {
		const translations = (this._locales[locale] ?? {}) as Record<
			string,
			string
		>;
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
