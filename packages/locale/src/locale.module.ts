import { type DynamicModule, Inject, Module, OnModuleInit, type Provider } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { BaseLocaleAdapter } from "./adapters/base-locale.adapter";
import { LocalizationInterceptor } from "./interceptors/localization.interceptor";
import { type NestWhatsLocaleOptions } from "./interfaces";
import { LOCALE_ADAPTER, LOCALE_OPTIONS, LOCALE_RESOLVERS } from "./locale.constants";

@Module({})
export class NestWhatsLocaleModule implements OnModuleInit {
	public static forRoot(options: NestWhatsLocaleOptions): DynamicModule {
		const resolvers = Array.isArray(options.resolvers) ? options.resolvers : [options.resolvers];

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
