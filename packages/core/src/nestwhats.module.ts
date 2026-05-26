import {
	DynamicModule,
	Module,
	ModuleMetadata,
	Provider,
} from "@nestjs/common";
import { Client, ClientOptions, LocalAuth } from "whatsapp-web.js";
import { ClientsRegistryService } from "./clients-registry.service";
import { CommandsService } from "./commands/commands.service";
import { ListenerRegistryService } from "./listeners/listener-registry.service";
import { NestWhatsClientService } from "./nestwhats-client.service";
import {
	NESTWHATS_DEFAULT_NAME,
	NestWhatsClientOptions,
	resolveClientOptions,
} from "./nestwhats-options.interface";
import { NestWhatsSharedModule } from "./nestwhats-shared.module";
import { getClientToken } from "./providers/client-token.util";

function toClientOptions(options: NestWhatsClientOptions): ClientOptions {
	const { name: clientName, prefix: _p, printQR: _q, ignoreSelf: _i, ...rest } = options;

	if (rest.authStrategy instanceof LocalAuth && !rest.authStrategy.clientId) {
		rest.authStrategy.clientId = clientName;
	}

	return rest as ClientOptions;
}

@Module({})
// biome-ignore lint/complexity/noStaticOnlyClass: This class is designed to only have static methods for module registration.
export class NestWhatsModule {
	public static forRoot(options: Partial<NestWhatsClientOptions>): DynamicModule {
		const resolved = resolveClientOptions(options);
		const clientToken = getClientToken(resolved.name);
		const lifecycleToken = Symbol(
			`NESTWHATS::LIFECYCLE_${resolved.name.toUpperCase()}`,
		);

		const providers: Provider[] = [
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
					new NestWhatsClientService(client, resolved, clientsRegistry, commandsService, listenerRegistry),
				inject: [clientToken, ClientsRegistryService, CommandsService, ListenerRegistryService],
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
		) => Promise<Partial<NestWhatsClientOptions>> | Partial<NestWhatsClientOptions>;
		inject?: any[];
	}): DynamicModule {
		const displayName = options.name ?? NESTWHATS_DEFAULT_NAME;
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
				useFactory: async (...args: any[]) =>
					resolveClientOptions({
						...(await options.useFactory(...args)),
						name: options.name,
					}),
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
					clientsRegistry: ClientsRegistryService,
					commandsService: CommandsService,
					listenerRegistry: ListenerRegistryService,
				) =>
					new NestWhatsClientService(client, clientOptions, clientsRegistry, commandsService, listenerRegistry),
				inject: [clientToken, optionsToken, ClientsRegistryService, CommandsService, ListenerRegistryService],
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
