import type { NestWhatsExecutionContext } from "nestwhats";
import type { Message } from "whatsapp-web.js";
import { DDI_LOCALE } from "../constants/phone-ddi";
import type { LocaleResolver } from "../interfaces/locale-resolver.interface";

function extractDdi(phone: string): string | undefined {
	for (const len of [3, 2, 1]) {
		const prefix = phone.slice(0, len);
		if (DDI_LOCALE[prefix]) return prefix;
	}
	return undefined;
}

export class PhoneCountryResolver implements LocaleResolver {
	public async resolve(
		context: NestWhatsExecutionContext,
	): Promise<string | undefined> {
		const args = context.getContext<"message">();
		if (!args) return undefined;
		const message = (Array.isArray(args) ? args[0] : args) as
			| Message
			| undefined;
		if (!message) return undefined;

		const phone = await this.extractPhone(message);
		if (!phone) return undefined;

		const ddi = extractDdi(phone);
		return ddi ? DDI_LOCALE[ddi] : undefined;
	}

	private async extractPhone(message: Message): Promise<string | undefined> {
		const sender = message.author ?? message.from;
		if (!sender) return undefined;

		if (sender.endsWith("@lid")) {
			try {
				const contact = await message.getContact();
				if (contact.id.server === "c.us") return contact.id.user;
				const serialized = contact.id._serialized;
				if (serialized?.includes("@c.us")) return serialized.replace(/@.*/, "");
				return undefined;
			} catch {
				return undefined;
			}
		}

		return sender.replace(/@.*/, "");
	}
}
