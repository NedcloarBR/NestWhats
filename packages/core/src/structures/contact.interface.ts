/**
 * Portable contact shape. `TRaw` is the platform's own contact object —
 * reach for it whenever you need something this contract does not cover.
 */
export interface NestWhatsContact<TRaw = unknown> {
	/** Canonical id of the contact. */
	id: string;
	/**
	 * Phone number in international form, without punctuation.
	 *
	 * Absent when the platform hides it — a LID identifies a contact without
	 * revealing the number.
	 */
	phone?: string;
	/** Name the contact publishes about itself, its WhatsApp push name. */
	displayName?: string;
	/** Name this account saved the contact under, if any. */
	savedName?: string;
	/** This is the connected account itself. */
	isMe: boolean;
	/** Registered as a WhatsApp Business account. */
	isBusiness?: boolean;
	/** Blocked by this account. */
	isBlocked?: boolean;
	/** URL of the profile picture, or `undefined` when there is none or it is hidden. */
	getProfilePictureUrl(): Promise<string | undefined>;
	/** The platform's own contact object, untouched. */
	readonly raw: TRaw;
}
