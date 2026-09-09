import { Injectable } from "@nestjs/common";
import {
	CurrentLocale,
	CurrentTranslate,
	DDI,
	type TranslationFn,
} from "@nestwhats/locale";
import { Command, Message, type NestWhatsMessage } from "nestwhats";

@Injectable()
export class GreetingHandler {
	// The translation function is injected into the handler, so there is no
	// prop-drilling and no locale to pass around.
	@Command({ name: "hello", description: "Greets you in your language" })
	public async onHello(
		@Message() message: NestWhatsMessage,
		@CurrentTranslate() t: TranslationFn,
	) {
		await message.reply(t("greeting.hello", { name: "Ned" }));
	}

	@Command({ name: "bye", description: "Says goodbye" })
	public async onBye(
		@Message() message: NestWhatsMessage,
		@CurrentTranslate() t: TranslationFn,
	) {
		await message.reply(t("greeting.bye"));
	}

	// `undefined` is a normal answer, not a failure: a contact identified by a
	// LID publishes no number, and a group has none behind it. Resolved once
	// per message by the interceptor, so reading it here costs nothing.
	@Command({ name: "ddi", description: "Shows your country code" })
	public async onDdi(
		@Message() message: NestWhatsMessage,
		@DDI() ddi: string | undefined,
		@CurrentLocale() locale: string,
	) {
		await message.reply(
			ddi
				? `+${ddi}, so I answer in ${locale}`
				: `no number to read, falling back to ${locale}`,
		);
	}
}
