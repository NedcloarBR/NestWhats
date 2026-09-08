import { NestWhatsMessageType } from "nestwhats";
import type { MessageTypes as MessageTypeName } from "whatsapp-web.js";
import { MessageTypes } from "../runtime.js";

/**
 * whatsapp-web.js message types, mapped to the portable
 * {@link NestWhatsMessageType}.
 *
 * Partial on purpose: a type with no portable equivalent is absent, and the
 * adapter reports `Unknown` for it rather than inventing a category.
 */
export const MESSAGE_TYPE_MAP: Partial<
	Record<MessageTypeName, NestWhatsMessageType>
> = {
	[MessageTypes.TEXT]: NestWhatsMessageType.Text,
	[MessageTypes.IMAGE]: NestWhatsMessageType.Image,
	[MessageTypes.VIDEO]: NestWhatsMessageType.Video,
	[MessageTypes.AUDIO]: NestWhatsMessageType.Audio,
	[MessageTypes.VOICE]: NestWhatsMessageType.Voice,
	[MessageTypes.STICKER]: NestWhatsMessageType.Sticker,
	[MessageTypes.DOCUMENT]: NestWhatsMessageType.Document,
	[MessageTypes.LOCATION]: NestWhatsMessageType.Location,
	[MessageTypes.CONTACT_CARD]: NestWhatsMessageType.ContactCard,
	[MessageTypes.CONTACT_CARD_MULTI]: NestWhatsMessageType.ContactCard,
	[MessageTypes.POLL_CREATION]: NestWhatsMessageType.Poll,
	[MessageTypes.REVOKED]: NestWhatsMessageType.Revoked,
};
