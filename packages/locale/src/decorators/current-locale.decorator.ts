import { createParamDecorator } from "@nestjs/common";
import { LocaleStorage } from "../locale.context.js";

/**
 * Injects the locale resolved for this message — the first answer a resolver
 * gave, or the configured fallback.
 *
 * ```typescript
 * @Command({ name: 'lang', description: 'Shows the language in use' })
 * async onLang(@Message() message: NestWhatsMessage, @CurrentLocale() locale: string) {
 *   await message.reply(locale);
 * }
 * ```
 */
export const CurrentLocale = createParamDecorator(
	(): string => LocaleStorage.getStore()?.locale ?? "en-US",
);
