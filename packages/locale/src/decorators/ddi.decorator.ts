import { createParamDecorator } from "@nestjs/common";
import { LocaleStorage } from "../locale.context.js";

/**
 * Injects the sender's country calling code — `55` for Brazil, `1` for the
 * United States.
 *
 * ```typescript
 * @Command({ name: 'ddi', description: 'Shows your country code' })
 * async onDdi(@Message() message: NestWhatsMessage, @DDI() ddi?: string) {
 *   await message.reply(ddi ? `+${ddi}` : 'no number to read');
 * }
 * ```
 *
 * `undefined` is a normal answer, not a failure: a contact identified by a
 * LID publishes no number, and a group has none behind it. Resolved once per
 * message by the interceptor, so reading it here costs nothing.
 */
export const DDI = createParamDecorator(
	(): string | undefined => LocaleStorage.getStore()?.ddi,
);
