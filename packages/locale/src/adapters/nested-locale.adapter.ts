import type { BaseLocaleLoader } from "../loaders/base-locale.loader";
import { BaseLocaleAdapter } from "./base-locale.adapter";

type TranslationData = Record<string, any>;

export interface NestedLocaleAdapterOptions {
	fallbackLocale?: string;
	locales?: Record<string, TranslationData> | BaseLocaleLoader;
}

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
