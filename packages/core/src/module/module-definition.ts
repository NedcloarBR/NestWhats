import { ConfigurableModuleBuilder } from "@nestjs/common";
import type { NestWhatsModuleOptions } from "./module-options.interface.js";

/**
 * Implement this to build the module's options from injected providers, and
 * hand the class to `forRootAsync` with `useClass` or `useExisting`.
 *
 * ```typescript
 * @Injectable()
 * export class NestWhatsConfig implements NestWhatsOptionsFactory {
 *   public constructor(private readonly config: ConfigService) {}
 *
 *   public createNestWhatsOptions(): NestWhatsModuleOptions {
 *     return { adapters: [new WhatsAppWebJsAdapterFactory({ … })] };
 *   }
 * }
 * ```
 */
export interface NestWhatsOptionsFactory {
	createNestWhatsOptions():
		| NestWhatsModuleOptions
		| Promise<NestWhatsModuleOptions>;
}

/**
 * Options a client needs to be *declared* rather than configured, which is why
 * they are extras: the module has to know the names while it is being defined,
 * and in `forRootAsync` the configuration itself only exists once the factory
 * has run.
 */
export interface NestWhatsModuleExtras {
	/**
	 * Clients to create in `forRootAsync`.
	 *
	 * Required for anything other than a single client called `default`: the
	 * injection tokens have to exist while the module is being defined, and the
	 * configuration only exists after the factory has run, so the module cannot
	 * learn the names from it.
	 */
	clientNames?: string[];
}

export const {
	ConfigurableModuleClass: NestWhatsConfigurableModule,
	MODULE_OPTIONS_TOKEN: NESTWHATS_MODULE_OPTIONS,
	OPTIONS_TYPE: NESTWHATS_OPTIONS_TYPE,
	ASYNC_OPTIONS_TYPE: NESTWHATS_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<NestWhatsModuleOptions>({
	moduleName: "NestWhats",
})
	.setClassMethodName("forRoot")
	.setFactoryMethodName("createNestWhatsOptions")
	.setExtras<NestWhatsModuleExtras>({}, (definition) => definition)
	.build();
