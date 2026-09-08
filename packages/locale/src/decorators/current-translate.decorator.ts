import { createParamDecorator } from "@nestjs/common";
import type { TranslationFn } from "../interfaces/locale-options.interface.js";
import { LocaleStorage } from "../locale.context.js";

/**
 * Injects the translation function for the locale resolved for this message.
 *
 * ```typescript
 * @Command({ name: 'hello' })
 * async onHello(@CurrentTranslate() t: TranslationFn) {
 *   return t('commands.hello', { name: 'Ana' });
 * }
 * ```
 *
 * Outside a resolved context it falls back to returning the key, so a handler
 * never throws for want of a translation.
 */
export const CurrentTranslate = createParamDecorator(
	(): TranslationFn =>
		LocaleStorage.getStore()?.translate ?? ((key: string) => key),
);
