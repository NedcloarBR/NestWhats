import {
	type DynamicModule,
	Inject,
	Module,
	OnModuleInit,
	type Provider,
} from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { BaseLocaleAdapter } from "./adapters/base-locale.adapter.js";
import { LocalizationInterceptor } from "./interceptors/localization.interceptor.js";
import { type NestWhatsLocaleOptions } from "./interfaces/index.js";
import {
	LOCALE_ADAPTER,
	LOCALE_OPTIONS,
	LOCALE_RESOLVERS,
} from "./locale.constants.js";

/**
 * Translations for command replies and listener output.
 *
 * ```typescript
 * NestWhatsLocaleModule.forRoot({
 *   adapter: new NestedLocaleAdapter({ locales: new JSONLocaleLoader({ basePath }) }),
 *   resolvers: [new PhoneCountryResolver()],
 * })
 * ```
 */
@Module({})
export class NestWhatsLocaleModule implements OnModuleInit {
	public static forRoot(options: NestWhatsLocaleOptions): DynamicModule {
		if (!options?.adapter) {
			throw new Error(
				"[NestWhats] NestWhatsLocaleModule.forRoot requires an 'adapter' (e.g. new NestedLocaleAdapter({ locales }))",
			);
		}

		const resolvers = (
			Array.isArray(options.resolvers) ? options.resolvers : [options.resolvers]
		).filter((resolver) => resolver != null);

		if (resolvers.length === 0) {
			throw new Error(
				"[NestWhats] NestWhatsLocaleModule.forRoot requires at least one resolver (e.g. new PhoneCountryResolver())",
			);
		}

		const providers: Provider[] = [
			{ provide: LOCALE_ADAPTER, useValue: options.adapter },
			{ provide: LOCALE_RESOLVERS, useValue: resolvers },
			{ provide: LOCALE_OPTIONS, useValue: options },
			{ provide: APP_INTERCEPTOR, useClass: LocalizationInterceptor },
		];

		return {
			global: true,
			module: NestWhatsLocaleModule,
			providers,
			exports: [LOCALE_ADAPTER],
		};
	}

	public constructor(
		@Inject(LOCALE_ADAPTER) private readonly adapter: BaseLocaleAdapter,
	) {}

	public async onModuleInit(): Promise<void> {
		await this.adapter.loadLocales();
	}
}
