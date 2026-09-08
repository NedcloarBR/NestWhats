import { DynamicModule, Logger, Module, Provider, Scope } from "@nestjs/common";
import { NestWhatsClient } from "../client/client.js";
import { NestWhatsClientService } from "../client/client.service.js";
import {
	getClientToken,
	getRequestedClientNames,
} from "../client/client-token.util.js";
import { ClientsRegistryService } from "../client/clients-registry.service.js";
import { CommandsService } from "../commands/commands.service.js";
import { ListenerRegistryService } from "../listeners/listener-registry.service.js";
import {
	buildAdapterRegistry,
	resolveFactory,
	toAdapterFactory,
} from "./adapter-registry.js";
import {
	NESTWHATS_ASYNC_OPTIONS_TYPE,
	NESTWHATS_MODULE_OPTIONS,
	NESTWHATS_OPTIONS_TYPE,
	NestWhatsConfigurableModule,
} from "./module-definition.js";
import {
	AdapterRegistry,
	NESTWHATS_DEFAULT_CLIENT,
	NESTWHATS_DEFAULT_NAME,
	NESTWHATS_DEFAULT_PREFIX,
	NESTWHATS_GLOBAL_OPTIONS_TOKEN,
	NestWhatsClientDeclaration,
	NestWhatsClientOptions,
	NestWhatsModuleOptions,
	ResolvedClientOptions,
	resolveClientOptions,
} from "./module-options.interface.js";
import { NestWhatsSharedModule } from "./shared.module.js";

/**
 * Both declaration forms carry the same field names, so this is a copy — it
 * exists to strip `NestWhatsClientConfig`'s factory-typed `options` down to the
 * loose record the rest of the module works with.
 */
function toClientOptions(
	client: NestWhatsClientDeclaration,
): NestWhatsClientOptions {
	return {
		name: client.name,
		adapter: client.adapter,
		options: client.options as Record<string, unknown> | undefined,
		prefix: client.prefix,
		ignoreSelf: client.ignoreSelf,
	};
}

/** Module-level settings a client inherits unless it says otherwise. */
type ClientDefaults = Pick<
	NestWhatsModuleOptions,
	"disconnectDebounceMs" | "reconnect"
>;

function resolveFromClientOptions(
	clientOpts: NestWhatsClientOptions,
	registry: AdapterRegistry,
	defaults: ClientDefaults = {},
): ResolvedClientOptions {
	const name = clientOpts.name ?? NESTWHATS_DEFAULT_NAME;
	const factory = resolveFactory(registry, clientOpts.adapter, name);
	return {
		name,
		prefix: clientOpts.prefix ?? NESTWHATS_DEFAULT_PREFIX,
		ignoreSelf: clientOpts.ignoreSelf,
		adapter: factory.create(name, clientOpts.options),
		platform: factory.platform,
		adapterId: factory.id,
		options: clientOpts.options,
		disconnectDebounceMs: defaults.disconnectDebounceMs,
		reconnect: defaults.reconnect,
	};
}

function buildSyncProviders(resolved: ResolvedClientOptions): {
	providers: Provider[];
	exports: any[];
} {
	const clientToken = getClientToken(resolved.name);
	// Plain symbols on purpose, unlike the exported tokens: these are private to
	// the DynamicModule built right here, and `Symbol.for` would make two
	// forRoot() calls collide on one token.
	const lifecycleToken = Symbol(
		`NESTWHATS::LIFECYCLE_${resolved.name.toUpperCase()}`,
	);

	return {
		providers: [
			{
				provide: clientToken,
				useValue: new NestWhatsClient(resolved.name, resolved.adapter, {
					options: resolved.options,
					platform: resolved.platform,
					adapterId: resolved.adapterId,
				}),
			},
			{
				provide: lifecycleToken,
				useFactory: (
					ref: NestWhatsClient,
					clientsRegistry: ClientsRegistryService,
					commandsService: CommandsService,
					listenerRegistry: ListenerRegistryService,
				) =>
					new NestWhatsClientService(
						ref,
						resolved,
						clientsRegistry,
						commandsService,
						listenerRegistry,
					),
				inject: [
					clientToken,
					ClientsRegistryService,
					CommandsService,
					ListenerRegistryService,
				],
			},
		],
		exports: [clientToken],
	};
}

function resolveAsyncClient(
	moduleOptions: NestWhatsModuleOptions,
	name: string,
): ResolvedClientOptions {
	const config = moduleOptions.clients?.find((c) => c.name === name);
	if (config) {
		const registry = buildAdapterRegistry(moduleOptions.adapters ?? []);
		return resolveFromClientOptions(
			toClientOptions(config),
			registry,
			moduleOptions,
		);
	}

	if (moduleOptions.adapter) {
		const factory = toAdapterFactory(moduleOptions.adapter);
		return resolveClientOptions({
			adapter: factory.create(name),
			platform: factory.platform,
			adapterId: factory.id,
			name,
			ignoreSelf: moduleOptions.ignoreSelf,
			disconnectDebounceMs: moduleOptions.disconnectDebounceMs,
			reconnect: moduleOptions.reconnect,
		});
	}

	throw new Error(
		`[NestWhats] forRootAsync was asked for a client named "${name}", but the resolved configuration declares none — it has ${
			moduleOptions.clients?.length
				? `${moduleOptions.clients.map((c) => `"${c.name}"`).join(", ")}`
				: "no clients"
		}. Add it to 'clients', or pass the single-client 'adapter' shorthand.`,
	);
}

function buildAsyncProviders(
	name: string,
	optionsToken: string | symbol,
): { providers: Provider[]; exports: any[] } {
	const clientToken = getClientToken(name);
	const resolvedToken = Symbol(`NESTWHATS::RESOLVED_${name.toUpperCase()}`);
	const lifecycleToken = Symbol(`NESTWHATS::LIFECYCLE_${name.toUpperCase()}`);

	return {
		providers: [
			{
				provide: resolvedToken,
				useFactory: (moduleOptions: NestWhatsModuleOptions) =>
					resolveAsyncClient(moduleOptions, name),
				inject: [optionsToken],
			},
			{
				provide: clientToken,
				useFactory: (resolved: ResolvedClientOptions) =>
					new NestWhatsClient(resolved.name, resolved.adapter, {
						options: resolved.options,
						platform: resolved.platform,
						adapterId: resolved.adapterId,
					}),
				inject: [resolvedToken],
			},
			{
				provide: lifecycleToken,
				useFactory: (
					resolved: ResolvedClientOptions,
					ref: NestWhatsClient,
					clientsRegistry: ClientsRegistryService,
					commandsService: CommandsService,
					listenerRegistry: ListenerRegistryService,
				) =>
					new NestWhatsClientService(
						ref,
						resolved,
						clientsRegistry,
						commandsService,
						listenerRegistry,
					),
				inject: [
					resolvedToken,
					clientToken,
					ClientsRegistryService,
					CommandsService,
					ListenerRegistryService,
				],
			},
		],
		exports: [clientToken],
	};
}

/**
 * The entry point.
 *
 * ```typescript
 * NestWhatsModule.forRoot({
 *   adapters: [new WhatsAppWebJsAdapterFactory({ authStrategy: new LocalAuth() })],
 *   clients: [new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, { name: 'personal' })],
 * })
 * ```
 *
 * `forRootAsync` takes the same options from a factory, for configuration that
 * has to be injected.
 */
@Module({})
export class NestWhatsModule extends NestWhatsConfigurableModule {
	public static override forRoot(
		options: typeof NESTWHATS_OPTIONS_TYPE,
	): DynamicModule {
		// The generated definition provides MODULE_OPTIONS_TOKEN and nothing else;
		// the per-client providers are appended below, because their tokens come
		// from a value inside the options and no builder can express that.
		// biome-ignore lint/complexity/noThisInStatic: super keeps `this` on the subclass, which is what the builder derives the module from
		const base = super.forRoot(options);
		const {
			clients: clientList,
			adapters: adapterInstances = [],
			...globalDefaults
		} = options;

		const registry = buildAdapterRegistry(adapterInstances);

		if (globalDefaults.adapter && clientList?.length) {
			new Logger(NestWhatsModule.name).warn(
				"Both the single-client 'adapter' shorthand and the 'clients' array were provided — the shorthand adapter is ignored",
			);
		}

		const shorthand = globalDefaults.adapter
			? toAdapterFactory(globalDefaults.adapter)
			: undefined;

		if (!clientList?.length && shorthand && !registry.has(shorthand.id)) {
			registry.set(shorthand.id, shorthand);
		}

		const resolved: ResolvedClientOptions[] = clientList?.length
			? clientList.map((c) =>
					resolveFromClientOptions(
						toClientOptions(c),
						registry,
						globalDefaults,
					),
				)
			: shorthand
				? [
						resolveClientOptions({
							adapter: shorthand.create(NESTWHATS_DEFAULT_NAME),
							platform: shorthand.platform,
							adapterId: shorthand.id,
							ignoreSelf: globalDefaults.ignoreSelf,
							disconnectDebounceMs: globalDefaults.disconnectDebounceMs,
							reconnect: globalDefaults.reconnect,
						}),
					]
				: [];

		const names = new Set<string>();
		for (const client of resolved) {
			if (names.has(client.name)) {
				throw new Error(
					`[NestWhats] Duplicate client name "${client.name}" — client names must be unique`,
				);
			}
			names.add(client.name);
		}

		if (resolved.length === 0 && registry.size === 0) {
			new Logger(NestWhatsModule.name).warn(
				"forRoot called without adapters or clients — no clients will be started",
			);
		}

		const providers: Provider[] = [];
		const exports: any[] = [];

		for (const client of resolved) {
			const built = buildSyncProviders(client);
			providers.push(...built.providers);
			exports.push(...built.exports);
		}

		if (resolved.length === 1) {
			const defaultToken = getClientToken(resolved[0].name);
			providers.push({
				provide: NESTWHATS_DEFAULT_CLIENT,
				useExisting: defaultToken,
			});
			exports.push(NESTWHATS_DEFAULT_CLIENT);

			if (resolved[0].name !== NESTWHATS_DEFAULT_NAME) {
				providers.push({
					provide: getClientToken(NESTWHATS_DEFAULT_NAME),
					useExisting: defaultToken,
				});
				exports.push(getClientToken(NESTWHATS_DEFAULT_NAME));
			}
		}

		const covered = new Set(names);
		if (resolved.length === 1) covered.add(NESTWHATS_DEFAULT_NAME);
		for (const requested of getRequestedClientNames()) {
			if (covered.has(requested)) continue;
			const requestedToken = getClientToken(requested);
			providers.push({
				provide: requestedToken,
				// Transient: only instantiated (and thrown) when something injects it.
				scope: Scope.TRANSIENT,
				useFactory: () => {
					throw new Error(
						`[NestWhats] @InjectClient("${requested}") — no client named "${requested}" is declared in NestWhatsModule.forRoot (declared clients: ${
							[...names].join(", ") || "none"
						})`,
					);
				},
			});
			exports.push(requestedToken);
		}

		providers.push({
			provide: NESTWHATS_GLOBAL_OPTIONS_TOKEN,
			useValue: {
				adapterRegistry: registry,
				storage: options.storage,
				disconnectDebounceMs: options.disconnectDebounceMs,
				reconnect: options.reconnect,
			},
		});
		exports.push(NESTWHATS_GLOBAL_OPTIONS_TOKEN);

		return {
			...base,
			module: NestWhatsModule,
			global: true,
			imports: [NestWhatsSharedModule, ...(base.imports ?? [])],
			providers: [...(base.providers ?? []), ...providers],
			exports,
		};
	}

	public static override forRootAsync(
		options: typeof NESTWHATS_ASYNC_OPTIONS_TYPE,
	): DynamicModule {
		// `useFactory`, `useClass` and `useExisting` all resolve into
		// MODULE_OPTIONS_TOKEN here; everything below only needs the client names,
		// which are known before the configuration is.
		// biome-ignore lint/complexity/noThisInStatic: super keeps `this` on the subclass, which is what the builder derives the module from
		const base = super.forRootAsync(options);
		const optionsToken = NESTWHATS_MODULE_OPTIONS;

		const providers: Provider[] = [];
		const exports: any[] = [];

		// The configuration only exists once the factory has run, but the tokens
		// have to be created now — so any client that is not called "default"
		// has to be named here, in `clientNames`.
		//
		// Deriving the names from `@InjectClient` instead was tried and backed
		// out: that registry is process-wide, so a second module in the same
		// application would silently pull in the first one's client names, and
		// the result would depend on the order the decorators ran.
		const clientNames = options.clientNames?.length
			? options.clientNames
			: [NESTWHATS_DEFAULT_NAME];

		for (const name of clientNames) {
			const built = buildAsyncProviders(name, optionsToken);
			providers.push(...built.providers);
			exports.push(...built.exports);
		}

		if (clientNames.length === 1) {
			providers.push({
				provide: NESTWHATS_DEFAULT_CLIENT,
				useExisting: getClientToken(clientNames[0]),
			});
			exports.push(NESTWHATS_DEFAULT_CLIENT);
		}

		if (clientNames.length === 1 && clientNames[0] !== NESTWHATS_DEFAULT_NAME) {
			providers.push({
				provide: getClientToken(NESTWHATS_DEFAULT_NAME),
				useExisting: getClientToken(clientNames[0]),
			});
			exports.push(getClientToken(NESTWHATS_DEFAULT_NAME));
		}

		const covered = new Set(clientNames);
		if (clientNames.length === 1) covered.add(NESTWHATS_DEFAULT_NAME);
		for (const requested of getRequestedClientNames()) {
			if (covered.has(requested)) continue;
			const requestedToken = getClientToken(requested);
			providers.push({
				provide: requestedToken,
				// Transient: only instantiated (and thrown) when something injects it.
				scope: Scope.TRANSIENT,
				useFactory: () => {
					throw new Error(
						`[NestWhats] @InjectClient("${requested}") — no client named "${requested}" is declared in NestWhatsModule.forRootAsync (declared clients: ${clientNames.join(", ")})`,
					);
				},
			});
			exports.push(requestedToken);
		}

		providers.push({
			provide: NESTWHATS_GLOBAL_OPTIONS_TOKEN,
			useFactory: (moduleOptions: NestWhatsModuleOptions) => {
				const adapterRegistry = buildAdapterRegistry(
					moduleOptions.adapters ?? [],
				);
				if (!moduleOptions.clients?.length && moduleOptions.adapter) {
					const shorthand = toAdapterFactory(moduleOptions.adapter);
					if (!adapterRegistry.has(shorthand.id)) {
						adapterRegistry.set(shorthand.id, shorthand);
					}
				}
				return {
					adapterRegistry,
					storage: moduleOptions.storage,
					disconnectDebounceMs: moduleOptions.disconnectDebounceMs,
					reconnect: moduleOptions.reconnect,
				};
			},
			inject: [optionsToken],
		});
		exports.push(NESTWHATS_GLOBAL_OPTIONS_TOKEN);

		return {
			...base,
			module: NestWhatsModule,
			global: true,
			imports: [NestWhatsSharedModule, ...(base.imports ?? [])],
			providers: [...(base.providers ?? []), ...providers],
			exports,
		};
	}
}
