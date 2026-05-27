export abstract class BaseLocaleLoader<Options = any> {
	protected readonly options: Options;

	public constructor(options: Options) {
		this.options = options;
	}

	public abstract load(): Promise<Record<string, Record<string, unknown>>>;
}
