import { JidKind, type NestWhatsMessage, parseJid } from "nestwhats";
import { DDI_LOCALE } from "./constants/phone-ddi.js";

/**
 * The country calling code at the front of a number, or `undefined` when it is
 * one this package has no entry for.
 *
 * Longest prefix wins: `55` and `595` both start with a `5`, so trying three
 * digits before two before one is what keeps Paraguay out of Brazil.
 */
export function ddiOf(phone: string): string | undefined {
	const digits = phone.replace(/\D/g, "");
	for (const length of [3, 2, 1]) {
		const prefix = digits.slice(0, length);
		if (DDI_LOCALE[prefix]) return prefix;
	}
	return undefined;
}

/**
 * The sender's country calling code, or `undefined` when there is no number to
 * read.
 *
 * A `@user` id carries the number, so that costs nothing. A `@lid` hides it —
 * WhatsApp's privacy-preserving address — so the contact has to be resolved
 * through the adapter, which not every platform can do. Groups, broadcasts and
 * newsletters have no phone behind them at all.
 *
 * Called once per message by {@link LocalizationInterceptor}, so a handler and
 * every resolver read the same answer rather than each paying for it.
 */
export async function ddiOfMessage(
	message: NestWhatsMessage | undefined,
): Promise<string | undefined> {
	const phone = await phoneOfMessage(message);
	return phone ? ddiOf(phone) : undefined;
}

/** The sender's phone number, when the id or the contact gives one up. */
export async function phoneOfMessage(
	message: NestWhatsMessage | undefined,
): Promise<string | undefined> {
	const sender = message?.senderId;
	if (!sender) return undefined;

	const parsed = parseJid(sender);
	if (parsed?.kind === JidKind.User) return parsed.user;
	if (parsed?.kind !== JidKind.Lid) return undefined;

	try {
		const contact = await message?.getContact?.();
		if (!contact) return undefined;
		if (contact.phone) return contact.phone;

		const contactJid = parseJid(contact.id);
		return contactJid?.kind === JidKind.User ? contactJid.user : undefined;
	} catch {
		// A platform that cannot fetch a contact is not an error here: it means
		// the number is not visible, and the fallback locale applies.
		return undefined;
	}
}
