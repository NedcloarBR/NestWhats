import {
	areJidsSameUser,
	type Contact,
	isPnUser,
	type WABusinessProfile,
} from "@whiskeysockets/baileys";
import { bareId, type NestWhatsContact } from "nestwhats";
import { toCanonicalJid } from "./jid.js";
import type { BaileysSocketHandle } from "./socket-handle.js";

/**
 * Baileys contact. The native `Contact` is available on `raw`.
 *
 * Baileys keeps no contact store, so one of these carries only what the
 * socket said at the time — a sender's push name from the message, the phone
 * number when the id or its alternate form reveals it. `isBlocked` comes from
 * the blocklist WhatsApp sends after connecting; `isBusiness` is left
 * undefined rather than guessed, and `getBusinessProfile()` asks.
 */
export class BaileysContact implements NestWhatsContact<Contact> {
	public constructor(
		public readonly raw: Contact,
		private readonly handle: BaileysSocketHandle,
	) {}

	public get id() {
		return toCanonicalJid(this.raw.id);
	}

	public get phone() {
		const pn =
			this.raw.phoneNumber ?? (isPnUser(this.raw.id) ? this.raw.id : undefined);
		return pn ? bareId(pn) : undefined;
	}

	public get displayName() {
		return this.raw.notify;
	}

	public get savedName() {
		return this.raw.name;
	}

	/**
	 * Whether this account has the contact blocked. `undefined` until
	 * WhatsApp has sent the blocklist, which it does shortly after connecting.
	 */
	public get isBlocked() {
		const blocked = this.handle.isBlocked(this.raw.id);
		if (blocked === true) return true;
		// A contact reached by LID is on the blocklist under its phone number.
		const pn = this.raw.phoneNumber;
		return pn ? (this.handle.isBlocked(pn) ?? blocked) : blocked;
	}

	/**
	 * The contact's business profile, when it is a WhatsApp Business account —
	 * address, description, category, hours. `undefined` for an ordinary one.
	 */
	public async getBusinessProfile(): Promise<WABusinessProfile | undefined> {
		const profile = await this.handle.socket
			.getBusinessProfile(this.raw.id)
			.catch(() => undefined);
		return profile || undefined;
	}

	public get isMe() {
		const me = this.handle.user;
		if (!me) return false;
		return (
			areJidsSameUser(me.id, this.raw.id) ||
			(!!me.lid && areJidsSameUser(me.lid, this.raw.id))
		);
	}

	public async getProfilePictureUrl(): Promise<string | undefined> {
		// Answers with an error both when there is no picture and when privacy
		// hides it; the contract does not distinguish those either.
		return this.handle.socket
			.profilePictureUrl(this.raw.id, "image")
			.catch(() => undefined);
	}
}
