import {
	DynamicModule,
	Module,
	ModuleMetadata,
	Provider,
} from "@nestjs/common";
import { Client, ClientOptions } from "whatsapp-web.js";
import { ClientsRegistryService } from "./clients-registry.service";
import { CommandsService } from "./commands/commands.service";
import { ListenerRegistryService } from "./listeners/listener-registry.service";
import { NestWhatsClientService } from "./nestwhats-client.service";
import { NestWhatsClientOptions } from "./nestwhats-options.interface";
import { NestWhatsSharedModule } from "./nestwhats-shared.module";
import { getClientToken } from "./providers/client-token.util";

function toClientOptions(options: NestWhatsClientOptions): ClientOptions {
	const { name: _n, prefix: _p, ...rest } = options;
	return rest as ClientOptions;
}

@Module({})
// biome-ignore lint/complexity/noStaticOnlyClass: This class is designed to only have static methods for module registration.
export class NestWhatsModule {
	public static forRoot(options: NestWhatsClientOptions): DynamicModule {
		const displayName = options.name ?? "default";
		const clientToken = getClientToken(displayName);
		const lifecycleToken = Symbol(
			`NESTWHATS::LIFECYCLE_${displayName.toUpperCase()}`,
		);

		const providers: Provider[] = [
			{
				provide: clientToken,
				useValue: new Client(toClientOptions(options)),
			},
			{
				provide: lifecycleToken,
				useFactory: (
					client: Client,
					commandsService: CommandsService,
					listenerRegistry: ListenerRegistryService,
					clientsRegistry: ClientsRegistryService,
				) =>
					new NestWhatsClientService(
						client,
						options,
						commandsService,
						listenerRegistry,
						clientsRegistry,
					),
				inject: [
					clientToken,
					CommandsService,
					ListenerRegistryService,
					ClientsRegistryService,
				],
			},
		];

		const exports: (typeof clientToken)[] = [clientToken];

		if (!options.name) {
			providers.push({ provide: Client, useExisting: clientToken });
			exports.push(Client);
		}

		return {
			module: NestWhatsModule,
			global: true,
			imports: [NestWhatsSharedModule],
			providers,
			exports,
		};
	}

	public static forRootAsync(options: {
		name?: string;
		imports?: ModuleMetadata["imports"];
		useFactory: (
			...args: any[]
		) => Promise<NestWhatsClientOptions> | NestWhatsClientOptions;
		inject?: any[];
	}): DynamicModule {
		const displayName = options.name ?? "default";
		const clientToken = getClientToken(displayName);
		const optionsToken = Symbol(
			`NESTWHATS::OPTIONS_${displayName.toUpperCase()}`,
		);
		const lifecycleToken = Symbol(
			`NESTWHATS::LIFECYCLE_${displayName.toUpperCase()}`,
		);

		const providers: Provider[] = [
			{
				provide: optionsToken,
				useFactory: options.useFactory,
				inject: options.inject ?? [],
			},
			{
				provide: clientToken,
				useFactory: (clientOptions: NestWhatsClientOptions) =>
					new Client(toClientOptions(clientOptions)),
				inject: [optionsToken],
			},
			{
				provide: lifecycleToken,
				useFactory: (
					client: Client,
					clientOptions: NestWhatsClientOptions,
					commandsService: CommandsService,
					listenerRegistry: ListenerRegistryService,
					clientsRegistry: ClientsRegistryService,
				) =>
					new NestWhatsClientService(
						client,
						{ ...clientOptions, name: options.name },
						commandsService,
						listenerRegistry,
						clientsRegistry,
					),
				inject: [
					clientToken,
					optionsToken,
					CommandsService,
					ListenerRegistryService,
					ClientsRegistryService,
				],
			},
		];

		const exports: (typeof clientToken)[] = [clientToken];

		if (!options.name) {
			providers.push({ provide: Client, useExisting: clientToken });
			exports.push(Client);
		}

		return {
			module: NestWhatsModule,
			global: true,
			imports: [NestWhatsSharedModule, ...(options.imports ?? [])],
			providers,
			exports,
		};
	}
}
