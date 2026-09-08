import {
	type CallHandler,
	type ExecutionContext,
	Inject,
	Injectable,
	type NestInterceptor,
} from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { NestWhatsExecutionContext, type NestWhatsMessage } from "nestwhats";
import type { Observable } from "rxjs";
import { BaseLocaleAdapter } from "../adapters/base-locale.adapter.js";
import type { LocaleResolver } from "../interfaces/index.js";
import { LOCALE_ADAPTER, LOCALE_RESOLVERS } from "../locale.constants.js";
import { LocaleStorage } from "../locale.context.js";
import { ddiOfMessage } from "../phone.util.js";

/**
 * Runs the configured resolvers for each incoming message and puts the
 * resulting translation function in async storage, where `@CurrentTranslate()`
 * picks it up. Registered globally by `NestWhatsLocaleModule.forRoot`.
 */
@Injectable()
export class LocalizationInterceptor implements NestInterceptor {
	public constructor(
		private readonly moduleRef: ModuleRef,
		@Inject(LOCALE_ADAPTER) private readonly adapter: BaseLocaleAdapter,
		@Inject(LOCALE_RESOLVERS)
		private readonly resolvers: (LocaleResolver | Function)[],
	) {}

	public async intercept(
		context: ExecutionContext,
		next: CallHandler,
	): Promise<Observable<any>> {
		if (context.getType<string>() !== "nestwhats") return next.handle();

		const nestwhatsContext = NestWhatsExecutionContext.create(context);

		// Once per message, before the resolvers: a LID needs a contact lookup,
		// and paying for it in each resolver that wants the number would be one
		// round trip per resolver.
		const args = nestwhatsContext.getContext<"message">();
		const message = Array.isArray(args)
			? (args[1] as NestWhatsMessage | undefined)
			: undefined;
		const ddi = await ddiOfMessage(message);

		let locale: string | undefined;
		for (const resolverOrClass of this.resolvers) {
			const resolver = this.getResolver(resolverOrClass);
			locale = await resolver.resolve(nestwhatsContext, { ddi });
			if (locale !== undefined) break;
		}

		const resolvedLocale = locale ?? "en-US";
		const translate = (key: string, ...args: any[]) =>
			this.adapter.getTranslation(key, resolvedLocale, ...args);

		return LocaleStorage.run(
			{ translate, locale: resolvedLocale, ddi },
			next.handle.bind(next),
		);
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
