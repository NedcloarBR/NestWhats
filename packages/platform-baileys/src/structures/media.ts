import {
	type AnyMessageContent,
	normalizeMessageContent,
	type proto,
} from "@whiskeysockets/baileys";
import type { NestWhatsMedia, NestWhatsMessageContent } from "nestwhats";

/** The content keys that carry an attachment. `ptvMessage` is a video note. */
export const MEDIA_KINDS = [
	"imageMessage",
	"videoMessage",
	"ptvMessage",
	"audioMessage",
	"documentMessage",
	"stickerMessage",
] as const;

export type MediaKind = (typeof MEDIA_KINDS)[number];
export type MediaContent = NonNullable<proto.IMessage[MediaKind]>;

/**
 * The attachment inside a message, looking through the wrappers Baileys puts
 * around ephemeral, view-once and captioned-document messages.
 */
export function findMediaContent(
	message: proto.IMessage | null | undefined,
): { kind: MediaKind; content: MediaContent } | undefined {
	const content = normalizeMessageContent(message);
	if (!content) return undefined;
	for (const kind of MEDIA_KINDS) {
		const inner = content[kind];
		if (inner) return { kind, content: inner };
	}
	return undefined;
}

/**
 * Portable content -> what `sendMessage` takes. Baileys picks the message type
 * from the key (`image`, `video`, …), so the mimetype decides it here; anything
 * that is not an image, video or audio goes as a document, which is the only
 * kind WhatsApp accepts for an arbitrary file.
 */
export function toSendContent(
	content: NestWhatsMessageContent,
): AnyMessageContent {
	if (typeof content === "string") return { text: content };
	const { data, mimetype, caption, filename } = content;
	if (mimetype.startsWith("image/")) return { image: data, caption, mimetype };
	if (mimetype.startsWith("video/")) return { video: data, caption, mimetype };
	if (mimetype.startsWith("audio/")) return { audio: data, mimetype };
	return { document: data, mimetype, fileName: filename, caption };
}

/**
 * A downloaded attachment as the portable shape. Baileys keeps the metadata on
 * the message and hands back only bytes, so both are needed.
 */
export function toNestWhatsMedia(
	data: Buffer,
	content: MediaContent,
): NestWhatsMedia {
	return {
		data,
		mimetype: content.mimetype ?? "application/octet-stream",
		filename:
			"fileName" in content ? (content.fileName ?? undefined) : undefined,
		caption: "caption" in content ? (content.caption ?? undefined) : undefined,
	};
}
