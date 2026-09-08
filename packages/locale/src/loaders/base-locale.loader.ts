/**
 * Base for catalogue loaders: where translation files come from, separate from
 * how they are read. Extend it to load from somewhere other than the filesystem.
 */
export abstract class BaseLocaleLoader<Options = any> {
	protected readonly options: Options;

	public constructor(options: Options) {
		this.options = options;
	}

	public abstract load(): Promise<Record<string, Record<string, unknown>>>;
}
