import type { NestWhatsContact } from "nestwhats";
import type { Client, Contact } from "whatsapp-web.js";
import { toCanonicalJid } from "./jid.js";

/** whatsapp-web.js contact. The native `Contact` is available on `raw`. */
export class WWebJsContact implements NestWhatsContact<Contact> {
	public constructor(
		public readonly raw: Contact,
		private readonly resolvedPhone?: string,
	) {}

	/**
	 * Builds the contact, resolving the real phone number through
	 * getContactLidAndPhone when the contact is LID-addressed and WhatsApp
	 * did not expose the number locally.
	 */
	public static async create(raw: Contact): Promise<WWebJsContact> {
		let resolvedPhone: string | undefined;
		if (raw.id.server === "lid") {
			try {
				// Structures carry the client at runtime, but the typings omit it.
				const client = (raw as Contact & { client: Client }).client;
				const [entry] = await client.getContactLidAndPhone([
					raw.id._serialized,
				]);
				resolvedPhone = entry?.pn ? entry.pn.replace(/@.*/, "") : undefined;
			} catch {
				// Lookup unavailable (offline page, unsupported version) — phone stays undefined.
			}
		}
		return new WWebJsContact(raw, resolvedPhone);
	}

	public get id() {
		return toCanonicalJid(this.raw.id._serialized);
	}

	public get phone() {
		// raw.number is unreliable since the LID migration: WhatsApp may fill it
		// with the LID digits even when the id holds the real phone wid.
		if (this.raw.id.server === "c.us") return this.raw.id.user;
		return this.resolvedPhone;
	}

	public get displayName() {
		return this.raw.pushname;
	}

	public get savedName() {
		return this.raw.name;
	}

	public get isMe() {
		return this.raw.isMe;
	}

	public get isBusiness() {
		return this.raw.isBusiness;
	}

	public get isBlocked() {
		return this.raw.isBlocked;
	}

	public async getProfilePictureUrl(): Promise<string | undefined> {
		return this.raw.getProfilePicUrl();
	}
}
