import type { AdapterFactoryOptions } from "../adapter/index.js";
import type { AdapterRef } from "../module/module-options.interface.js";

/** `options` typed by the factory, or left loose when the adapter is named by id. */
type OptionsFor<T> = T extends string
	? Record<string, unknown>
	: NonNullable<AdapterFactoryOptions<T>>;

/**
 * A client in `forRoot` whose `options` are typed by the factory receiving them.
 *
 * `clients` takes plain objects, and that is the shorter form for a client that
 * passes no options. This is the one to reach for when it does:
 *
 * ```typescript
 * clients: [
 *   { name: 'personal', prefix: '!' },
 *   new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, {
 *     name: 'business',
 *     options: { pairWithPhoneNumber: { phoneNumber: '5511999998888' } },
 *   }),
 * ]
 * ```
 *
 * Naming the factory class is what types `options`, so a typo fails the build
 * instead of silently starting with defaults. An instance works the same way;
 * an id cannot be checked and leaves `options` loose.
 */
export class NestWhatsClientConfig<T extends AdapterRef = AdapterRef> {
	public readonly adapter: T;
	public readonly name: string;
	public readonly options?: OptionsFor<T>;
	public readonly prefix?: string;
	public readonly ignoreSelf?: boolean;

	public constructor(
		adapter: T,
		config: {
			name: string;
			options?: OptionsFor<T>;
			prefix?: string;
			ignoreSelf?: boolean;
		},
	) {
		this.adapter = adapter;
		this.name = config.name;
		this.options = config.options;
		this.prefix = config.prefix;
		this.ignoreSelf = config.ignoreSelf;
	}
}
