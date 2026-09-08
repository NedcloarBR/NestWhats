import type { NestWhatsAdapter } from "./adapter.interface.js";
import type { AdapterOptionsSchema } from "./adapter-options-schema.js";
import type { AdapterPlatform } from "./adapter-platform.js";

/**
 * What a platform package registers in `forRoot`: the thing that *makes*
 * adapters, not an adapter itself.
 *
 * One factory holds the configuration shared by every client on that platform,
 * and `create` is called once per client. Keeping the two apart is what lets a
 * platform demand something per client — the official Cloud API needs a
 * distinct phone number id for each — and refuse at boot instead of quietly
 * starting two clients on the same account.
 *
 * It is also where the metadata belongs: `platform` and `optionsSchema`
 * describe the *platform*, so a dashboard can render a form and a badge before
 * any client exists, let alone connects.
 *
 * ```typescript
 * NestWhatsModule.forRoot({
 *   adapters: [new WhatsAppWebJsAdapterFactory({ authStrategy: new LocalAuth() })],
 *   clients: [new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, { name: 'personal' })],
 * })
 * ```
 *
 * `adapters` also takes the class itself, which builds it with its defaults —
 * and the class is what a client names to get its `options` typed, without a
 * variable to hold the instance in.
 */
export interface NestWhatsAdapterFactory<
	TAdapter extends NestWhatsAdapter = NestWhatsAdapter,
	TOptions = Record<string, unknown>,
> {
	/**
	 * Stable name for this factory, unique within one `forRoot`.
	 *
	 * It is how a client names the adapter it wants, and it is what gets written
	 * to storage for a virtual client — so it has to survive a restart and a
	 * minifier. Register the same platform twice with different configuration by
	 * giving the second one its own id.
	 */
	readonly id: string;
	/** How the platform presents itself in a UI — name, mark, colour. */
	readonly platform?: AdapterPlatform;
	/**
	 * Options worth offering in a UI. Optional and non-exhaustive: it drives
	 * form fields, it does not limit what `create` accepts.
	 */
	readonly optionsSchema?: AdapterOptionsSchema;
	/**
	 * Builds the adapter for one client.
	 *
	 * Anything identifying — credentials, a session directory — must be derived
	 * from `clientName` or come from `options`, never shared between the
	 * adapters this returns. Throw when the platform needs something this client
	 * did not provide: it fails at boot, naming the client, instead of failing
	 * as a confusing runtime error later.
	 *
	 * @param clientName - the client this adapter will serve.
	 * @param options - overrides merged over the factory's own configuration.
	 */
	create(clientName: string, options?: TOptions): TAdapter;
}

/**
 * A factory class, usable wherever a factory is.
 *
 * Passing the class instead of an instance builds it with its defaults, and —
 * because a class is in scope everywhere without being assigned to anything —
 * it is also how a client names its adapter inside the `@Module` decorator.
 */
export type AdapterFactoryClass<
	T extends NestWhatsAdapterFactory = NestWhatsAdapterFactory,
> = new (
	options?: any,
) => T;

/** The options a factory's `create` accepts, for typing a client's `options`. */
export type AdapterFactoryOptions<T> =
	T extends AdapterFactoryClass<infer F>
		? Parameters<F["create"]>[1]
		: T extends NestWhatsAdapterFactory
			? Parameters<T["create"]>[1]
			: Record<string, unknown>;
