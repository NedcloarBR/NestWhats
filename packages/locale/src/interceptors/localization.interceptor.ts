import {
	type CallHandler,
	type ExecutionContext,
	Inject,
	Injectable,
	type NestInterceptor,
} from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { NestWhatsExecutionContext } from "nestwhats";
import type { Observable } from "rxjs";
import { BaseLocaleAdapter } from "../adapters/base-locale.adapter";
import type { LocaleResolver, NestWhatsLocaleOptions } from "../interfaces";
import {
	LOCALE_ADAPTER,
	LOCALE_OPTIONS,
	LOCALE_RESOLVERS,
} from "../locale.constants";
import { LocaleStorage } from "../locale.context";

@Injectable()
export class LocalizationInterceptor implements NestInterceptor {
	public constructor(
		private readonly moduleRef: ModuleRef,
		@Inject(LOCALE_ADAPTER) private readonly adapter: BaseLocaleAdapter,
		@Inject(LOCALE_RESOLVERS)
		private readonly resolvers: (LocaleResolver | Function)[],
		@Inject(LOCALE_OPTIONS) private readonly options: NestWhatsLocaleOptions,
	) {}

	public async intercept(
		context: ExecutionContext,
		next: CallHandler,
	): Promise<Observable<any>> {
		if (context.getType<string>() !== "nestwhats") return next.handle();

		const nestwhatsContext = NestWhatsExecutionContext.create(context);

		let locale: string | undefined;
		for (const resolverOrClass of this.resolvers) {
			const resolver = this.getResolver(resolverOrClass);
			locale = await resolver.resolve(nestwhatsContext);
			if (locale !== undefined) break;
		}

		const resolvedLocale = locale ?? "en-US";
		const translate = (key: string, ...args: any[]) =>
			this.adapter.getTranslation(key, resolvedLocale, ...args);

		return LocaleStorage.run(translate, next.handle.bind(next));
	}

	private getResolver(resolver: LocaleResolver | Function): LocaleResolver {
		if (typeof resolver === "function") {
			try {
				return this.moduleRef.get(resolver as any, { strict: false });
			} catch {
				return this.moduleRef.create(resolver as any) as any;
			}
		}
		return resolver;
	}
}
