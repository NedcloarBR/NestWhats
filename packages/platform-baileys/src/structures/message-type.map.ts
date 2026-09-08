import type { proto } from "@whiskeysockets/baileys";
import { NestWhatsMessageType } from "nestwhats";

/**
 * Baileys content keys, mapped to the portable {@link NestWhatsMessageType}.
 *
 * Partial on purpose: a key with no portable equivalent is absent, and the
 * adapter reports `Unknown` for it rather than inventing a category. Two cases
 * are decided by the message itself rather than here — an `audioMessage` with
 * `ptt` is `Voice`, and a `protocolMessage` is `Revoked` only when its type
 * says so.
 */
export const MESSAGE_TYPE_MAP: Partial<
	Record<keyof proto.IMessage, NestWhatsMessageType>
> = {
	conversation: NestWhatsMessageType.Text,
	extendedTextMessage: NestWhatsMessageType.Text,
	imageMessage: NestWhatsMessageType.Image,
	videoMessage: NestWhatsMessageType.Video,
	ptvMessage: NestWhatsMessageType.Video,
	audioMessage: NestWhatsMessageType.Audio,
	stickerMessage: NestWhatsMessageType.Sticker,
	documentMessage: NestWhatsMessageType.Document,
	locationMessage: NestWhatsMessageType.Location,
	liveLocationMessage: NestWhatsMessageType.Location,
	contactMessage: NestWhatsMessageType.ContactCard,
	contactsArrayMessage: NestWhatsMessageType.ContactCard,
	pollCreationMessage: NestWhatsMessageType.Poll,
	pollCreationMessageV2: NestWhatsMessageType.Poll,
	pollCreationMessageV3: NestWhatsMessageType.Poll,
};
