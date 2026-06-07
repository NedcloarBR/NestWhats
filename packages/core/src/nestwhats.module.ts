import {
	DynamicModule,
	Module,
	ModuleMetadata,
	Provider,
} from "@nestjs/common";
import { Client } from "whatsapp-web.js";
import { ClientsRegistryService } from "./clients-registry.service";
import { CommandsService } from "./commands/commands.service";
import { ListenerRegistryService } from "./listeners/listener-registry.service";
import { NestWhatsClientService } from "./nestwhats-client.service";
import {
	NESTWHATS_GLOBAL_OPTIONS_TOKEN,
	NestWhatsClientOptions,
	NestWhatsModuleOptions,
	resolveClientOptions,
	toClientOptions,
} from "./nestwhats-options.interface";
import { NestWhatsSharedModule } from "./nestwhats-shared.module";
import { getClientToken } from "./providers/client-token.util";

function buildSyncProviders(resolved: NestWhatsClientOptions): {
	providers: Provider[];
	exports: any[];
} {
	const clientToken = getClientToken(resolved.name);
	const lifecycleToken = Symbol(
		`NESTWHATS::LIFECYCLE_${resolved.name.toUpperCase()}`,
	);

	return {
		providers: [
			{
				provide: clientToken,
				useValue: new Client(toClientOptions(resolved)),
			},
			{
				provide: lifecycleToken,
				useFactory: (
					client: Client,
					clientsRegistry: ClientsRegistryService,
					commandsService: CommandsService,
					listenerRegistry: ListenerRegistryService,
				) =>
					new NestWhatsClientService(
						client,
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

function buildAsyncProviders(
	name: string,
	optionsToken: symbol,
): { providers: Provider[]; exports: any[] } {
	const clientToken = getClientToken(name);
	const lifecycleToken = Symbol(`NESTWHATS::LIFECYCLE_${name.toUpperCase()}`);

	return {
		providers: [
			{
				provide: clientToken,
				useFactory: async (moduleOptions: NestWhatsModuleOptions) => {
					const { clients: list, ...globalDefaults } = moduleOptions;
					const clientOpts = list?.find((c) => c.name === name) ?? {};
					const resolved = resolveClientOptions({
						...globalDefaults,
						...clientOpts,
						name,
					});
					return new Client(toClientOptions(resolved));
				},
				inject: [optionsToken],
			},
			{
				provide: lifecycleToken,
				useFactory: (
					client: Client,
					moduleOptions: NestWhatsModuleOptions,
					clientsRegistry: ClientsRegistryService,
					commandsService: CommandsService,
					listenerRegistry: ListenerRegistryService,
				) => {
					const { clients: list, ...globalDefaults } = moduleOptions;
					const clientOpts = list?.find((c) => c.name === name) ?? {};
					const resolved = resolveClientOptions({
						...globalDefaults,
						...clientOpts,
						name,
					});
					return new NestWhatsClientService(
						client,
						resolved,
						clientsRegistry,
						commandsService,
						listenerRegistry,
					);
				},
				inject: [
					clientToken,
					optionsToken,
					ClientsRegistryService,
					CommandsService,
					ListenerRegistryService,
				],
			},
		],
		exports: [clientToken],
	};
}

@Module({})
// biome-ignore lint/complexity/noStaticOnlyClass: This class is designed to only have static methods for module registration.
export class NestWhatsModule {
	public static forRoot(options: NestWhatsModuleOptions): DynamicModule {
		const { clients: clientList, ...globalDefaults } = options;
		const list = clientList ?? [globalDefaults];

		const providers: Provider[] = [];
		const exports: any[] = [];

		for (const clientOpts of list) {
			const resolved = resolveClientOptions({
				...globalDefaults,
				...clientOpts,
			});
			const built = buildSyncProviders(resolved);
			providers.push(...built.providers);
			exports.push(...built.exports);
		}

		if (list.length === 1 && !list[0].name) {
			const defaultToken = getClientToken(resolveClientOptions(list[0]).name);
			providers.push({ provide: Client, useExisting: defaultToken });
			exports.push(Client);
		}

		providers.push({
			provide: NESTWHATS_GLOBAL_OPTIONS_TOKEN,
			useValue: {
				prefix: globalDefaults.prefix,
				printQR: globalDefaults.printQR,
			},
		});
		exports.push(NESTWHATS_GLOBAL_OPTIONS_TOKEN);

		return {
			module: NestWhatsModule,
			global: true,
			imports: [NestWhatsSharedModule],
			providers,
			exports,
		};
	}

	public static forRootAsync(options: {
		/**
		 * For single-client async (backward compat), omit this.
		 * For multi-client async, provide all client names here so DI tokens
		 * can be created statically. Names must match what the factory returns.
		 */
		clientNames?: string[];
		imports?: ModuleMetadata["imports"];
		useFactory: (
			...args: any[]
		) => Promise<NestWhatsModuleOptions> | NestWhatsModuleOptions;
		inject?: any[];
	}): DynamicModule {
		const optionsToken = Symbol("NESTWHATS::MODULE_OPTIONS");

		const providers: Provider[] = [
			{
				provide: optionsToken,
				useFactory: options.useFactory,
				inject: options.inject ?? [],
			},
		];
		const exports: any[] = [];

		if (options.clientNames && options.clientNames.length > 0) {
			for (const name of options.clientNames) {
				const built = buildAsyncProviders(name, optionsToken);
				providers.push(...built.providers);
				exports.push(...built.exports);
			}
		} else {
			const built = buildAsyncProviders("default", optionsToken);
			providers.push(...built.providers);
			exports.push(...built.exports);

			providers.push({
				provide: Client,
				useExisting: getClientToken("default"),
			});
			exports.push(Client);
		}

		providers.push({
			provide: NESTWHATS_GLOBAL_OPTIONS_TOKEN,
			useFactory: (moduleOptions: NestWhatsModuleOptions) => ({
				prefix: moduleOptions.prefix,
				printQR: moduleOptions.printQR,
			}),
			inject: [optionsToken],
		});
		exports.push(NESTWHATS_GLOBAL_OPTIONS_TOKEN);

		return {
			module: NestWhatsModule,
			global: true,
			imports: [NestWhatsSharedModule, ...(options.imports ?? [])],
			providers,
			exports,
		};
	}
}
