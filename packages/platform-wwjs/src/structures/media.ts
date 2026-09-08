import type { NestWhatsMedia, NestWhatsMessageContent } from "nestwhats";
import type {
	MessageSendOptions,
	MessageMedia as NativeMessageMedia,
} from "whatsapp-web.js";
import { MessageMedia } from "../runtime.js";

/**
 * whatsapp-web.js carries attachments as base64 strings; the portable contract
 * uses a Buffer. The conversion happens here, at the boundary, so nothing above
 * the adapter has to know which shape a platform prefers.
 */
export function toNativeMedia(media: NestWhatsMedia): NativeMessageMedia {
	return new MessageMedia(
		media.mimetype,
		media.data.toString("base64"),
		media.filename ?? null,
		media.data.byteLength,
	);
}

/**
 * The reverse of {@link toNativeMedia}: base64 back to a Buffer, and
 * whatsapp-web.js' `null` filename to `undefined`, which is what the portable
 * contract uses for "absent".
 */
export function toNestWhatsMedia(media: NativeMessageMedia): NestWhatsMedia {
	return {
		data: Buffer.from(media.data, "base64"),
		mimetype: media.mimetype,
		filename: media.filename ?? undefined,
	};
}

/**
 * Splits portable content into the pair whatsapp-web.js sends: the payload and
 * the options that travel beside it. A caption is an option there, not part of
 * the media object.
 */
export function toSendArgs(
	content: NestWhatsMessageContent,
): [string | NativeMessageMedia, MessageSendOptions | undefined] {
	if (typeof content === "string") return [content, undefined];
	return [
		toNativeMedia(content),
		content.caption ? { caption: content.caption } : undefined,
	];
}
