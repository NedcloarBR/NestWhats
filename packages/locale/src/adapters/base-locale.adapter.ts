import type { BaseLocaleLoader } from "../loaders/base-locale.loader.js";

/**
 * Base for translation adapters: holds the loaded catalogue and defines how a
 * key becomes a string.
 *
 * Extend it to support a catalogue shape the shipped adapters do not cover.
 * `loadLocales` accepts either a plain object or a {@link BaseLocaleLoader},
 * so where the files come from is the loader's problem, not the adapter's.
 */
export abstract class BaseLocaleAdapter<Options = any> {
	protected readonly options?: Options;
	protected _locales: Record<string, Record<string, unknown>> = {};

	public constructor(options?: Options) {
		this.options = options;
	}

	public async loadLocales(): Promise<void> {
		const locales = (this.options as any)?.locales;
		if (locales && typeof (locales as BaseLocaleLoader).load === "function") {
			this._locales = await (locales as BaseLocaleLoader).load();
		} else {
			this._locales = locales ?? {};
		}
	}

	public abstract getTranslation(
		key: string,
		locale: string,
		...args: any[]
	): string;
}
