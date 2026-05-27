import type { BaseLocaleLoader } from "../loaders/base-locale.loader";

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
