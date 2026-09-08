/**
 * Portable media payload.
 *
 * Platforms disagree on the wire shape — whatsapp-web.js wants base64 in a
 * `MessageMedia`, Baileys wants a Buffer or a stream — so the contract uses the
 * Node primitive and each adapter converts at its own boundary.
 */
export interface NestWhatsMedia {
	data: Buffer;
	/** IANA type, e.g. `image/jpeg`. */
	mimetype: string;
	filename?: string;
	/** Text shown alongside the media, where the platform supports it. */
	caption?: string;
}

/** What `sendMessage` and `reply` accept: plain text, or media. */
export type NestWhatsMessageContent = string | NestWhatsMedia;
