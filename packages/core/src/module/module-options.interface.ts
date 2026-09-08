import type { NestWhatsAdapter } from "../adapter/adapter.interface.js";
import type { NestWhatsAdapterFactory } from "../adapter/adapter-factory.interface.js";
import type {
	AdapterFactoryClass,
	AdapterFactoryOptions,
	AdapterPlatform,
	ReconnectPolicyOptions,
} from "../adapter/index.js";
import type { NestWhatsClientConfig } from "../client/client-config.js";
import type { VirtualClientStorageAdapter } from "../storage/index.js";

/**
 * How a client names the adapter it runs on: the factory class, an instance of
 * one, or its id.
 *
 * The class is normally the one to use — it needs no variable and still types
 * the client's `options`. The id is what a client restored from storage
 * carries, since neither of the other two survives a file.
 */
export type AdapterRef = AdapterFactoryClass | NestWhatsAdapterFactory | string;

/** What `adapters` takes: a configured factory, or the class to build with defaults. */
export type AdapterDeclaration = NestWhatsAdapterFactory | AdapterFactoryClass;

/**
 * A client declared in `forRoot` — a plain object, or a
 * {@link NestWhatsClientConfig} when its `options` should be typed against the
 * factory that receives them.
 */
export type NestWhatsClientDeclaration =
	| NestWhatsClientOptions
	| NestWhatsClientConfig<AdapterRef>;

/** One client's configuration, as `forRoot` and {@link NestWhatsClientConfig} carry it. */
export interface NestWhatsClientOptions {
	/** How this client is named and injected. */
	name: string;
	/**
	 * Which declared adapter it runs on. Omit when `forRoot` declares exactly
	 * one — there is nothing to disambiguate.
	 */
	adapter?: AdapterRef;
	/** Overrides merged over that adapter's configuration, for this client only. */
	options?: Record<string, unknown>;
	/** Command prefix; defaults to `!`. Editable at runtime. */
	prefix?: string;
	/** Drop messages this client itself sent. */
	ignoreSelf?: boolean;
}

/** Options for `NestWhatsModule.forRoot`. */
export interface NestWhatsModuleOptions {
	/**
	 * One factory per platform, holding the configuration its clients share.
	 * Each client gets its own adapter from `create`, so each gets its own
	 * connection.
	 *
	 * Takes a configured factory, or the class on its own to build it with its
	 * defaults:
	 *
	 * ```typescript
	 * adapters: [new WhatsAppWebJsAdapterFactory({ authStrategy: new LocalAuth() })]
	 * adapters: [WhatsAppWebJsAdapterFactory]
	 * ```
	 */
	adapters?: AdapterDeclaration[];
	/**
	 * The clients to start.
	 *
	 * {@link NestWhatsClientConfig} names the factory class, which is what types
	 * that client's `options`:
	 *
	 * ```typescript
	 * clients: [new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, { name: 'personal' })]
	 * ```
	 *
	 * A plain object works too, and with a single adapter declared it does not
	 * even name one — shorter, but `options` are not checked:
	 *
	 * ```typescript
	 * clients: [{ name: 'personal', prefix: '!' }]
	 * ```
	 */
	clients?: NestWhatsClientDeclaration[];
	/**
	 * Single-client shorthand: name and prefix fall back to the defaults. Use
	 * `clients` for any per-client customization; this is ignored when both are
	 * given.
	 */
	adapter?: AdapterDeclaration;
	/** Drop messages the client itself sent, instead of handling them. */
	ignoreSelf?: boolean;
	/**
	 * Where virtual clients created at runtime are kept, so they come back after
	 * a restart. Without it they live only for the current process.
	 */
	storage?: VirtualClientStorageAdapter;
	/**
	 * Hold a `disconnected` announcement for this many ms; a reconnect within
	 * the window cancels it. Useful for platforms that reconnect on their own —
	 * ~30000 is a sensible value there. `0` (default) announces immediately.
	 * A logout or auth failure always announces immediately.
	 */
	disconnectDebounceMs?: number;
	/**
	 * Reconnect clients after a drop, backing off by `DisconnectKind`. Off by
	 * default: platforms that reconnect on their own should keep owning it, and
	 * turning this on for them would race their own retries. Pass `{}` for the
	 * defaults (1s doubling to 60s, 5 min cooldown when the account is refused,
	 * never after a logout).
	 */
	reconnect?: ReconnectPolicyOptions;
}

/**
 * A client created at runtime rather than declared in the module.
 *
 * `adapter` takes the factory, or its id — which is what a configuration
 * restored from storage carries, since an object reference cannot be written
 * to a file.
 */
export interface VirtualClientOptions {
	/** How this client is named; must not collide with a declared one. */
	name: string;
	/** The factory to build from, or its id. */
	adapter?: AdapterRef;
	/** Overrides merged over that adapter's configuration. */
	options?: Record<string, unknown>;
	/** Command prefix; defaults to `!`. */
	prefix?: string;
	/** Drop messages this client itself sent. */
	ignoreSelf?: boolean;
}

/**
 * `VirtualClientOptions` with `options` typed by the adapter it names.
 *
 * Passing the factory gives the same checking a `NestWhatsClientConfig` has, so
 * a typo in an adapter option fails the build instead of silently starting a
 * client with default settings. Naming the adapter by id — how a restored
 * client arrives — cannot be checked, and falls back to a loose record.
 */
export type VirtualClientOptionsFor<T> = {
	name: string;
	adapter?: T;
	prefix?: string;
	ignoreSelf?: boolean;
} & (T extends string | undefined
	? { options?: Record<string, unknown> }
	: { options?: NonNullable<AdapterFactoryOptions<T>> });

/** Name a client gets when none is given. */
export const NESTWHATS_DEFAULT_NAME = "default";
/** Prefix a client gets when none is given. */
export const NESTWHATS_DEFAULT_PREFIX = "!";
/** Injection token holding the module-wide settings clients inherit. */
export const NESTWHATS_GLOBAL_OPTIONS_TOKEN = Symbol.for(
	"NESTWHATS::GLOBAL_OPTIONS",
);
/** Injection token for the client used when no name is given. */
export const NESTWHATS_DEFAULT_CLIENT = Symbol.for("NESTWHATS::DEFAULT_CLIENT");

/** Factory id to the factory clients are built from. */
export type AdapterRegistry = Map<string, NestWhatsAdapterFactory>;

/** Module-wide settings, resolved once and shared by every client. */
export interface NestWhatsGlobalOptions {
	adapterRegistry?: AdapterRegistry;
	storage?: VirtualClientStorageAdapter;
	disconnectDebounceMs?: number;
	reconnect?: ReconnectPolicyOptions;
}

/** One client's configuration with every default filled in and its adapter built. */
export interface ResolvedClientOptions {
	name: string;
	adapter: NestWhatsAdapter;
	/**
	 * Which platform backs this client, taken from the factory. Known before
	 * the adapter connects, which is what lets a dashboard label it right away.
	 */
	platform?: AdapterPlatform;
	/** Id of the factory that built the adapter. */
	adapterId?: string;
	/** The options the adapter was built with, as the client will expose them. */
	options?: Record<string, unknown>;
	prefix: string;
	ignoreSelf?: boolean;
	disconnectDebounceMs?: number;
	reconnect?: ReconnectPolicyOptions;
}

/** Fills in the defaults a client did not specify. */
export function resolveClientOptions(
	options: { adapter: NestWhatsAdapter } & Partial<
		Omit<ResolvedClientOptions, "adapter">
	>,
): ResolvedClientOptions {
	return {
		name: options.name ?? NESTWHATS_DEFAULT_NAME,
		prefix: options.prefix ?? NESTWHATS_DEFAULT_PREFIX,
		adapter: options.adapter,
		platform: options.platform,
		adapterId: options.adapterId,
		options: options.options,
		ignoreSelf: options.ignoreSelf,
		disconnectDebounceMs: options.disconnectDebounceMs,
		reconnect: options.reconnect,
	};
}
