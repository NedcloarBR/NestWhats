import type {
	WAPrivacyCallValue,
	WAPrivacyGroupAddValue,
	WAPrivacyMessagesValue,
	WAPrivacyOnlineValue,
	WAPrivacyValue,
	WAReadReceiptsValue,
} from "@whiskeysockets/baileys";

/**
 * The account's privacy settings, as WhatsApp's own *Settings → Privacy*
 * screen lists them. The value vocabularies are Baileys' — `all`, `contacts`,
 * `contact_blacklist` (contacts except…), `none` — and differ per setting
 * because WhatsApp's do.
 */
export interface BaileysPrivacySettings {
	/** Who sees "last seen". */
	lastSeen: WAPrivacyValue;
	/** Who sees you online; `match_last_seen` follows `lastSeen`. */
	online: WAPrivacyOnlineValue;
	/** Who sees your profile picture. */
	profilePicture: WAPrivacyValue;
	/** Who sees your profile text ("recado"). */
	about: WAPrivacyValue;
	/** Who sees your status/stories. */
	status: WAPrivacyValue;
	/** Whether you send and receive read receipts. */
	readReceipts: WAReadReceiptsValue;
	/** Who can add you to groups. */
	groupAdd: WAPrivacyGroupAddValue;
	/** Who can call you. */
	calls: WAPrivacyCallValue;
	/** Who can message you. */
	messages: WAPrivacyMessagesValue;
}

/**
 * WhatsApp's category names for each setting, as they come back from the
 * privacy IQ and as Baileys sends them.
 */
export const PRIVACY_CATEGORIES: Readonly<
	Record<keyof BaileysPrivacySettings, string>
> = {
	lastSeen: "last",
	online: "online",
	profilePicture: "profile",
	about: "about",
	status: "status",
	readReceipts: "readreceipts",
	groupAdd: "groupadd",
	calls: "calladd",
	messages: "messages",
};

/**
 * The raw category dictionary -> the typed shape. A category WhatsApp did not
 * report is left out rather than defaulted, so the result is `Partial`.
 */
export function toPrivacySettings(
	raw: Record<string, string>,
): Partial<BaileysPrivacySettings> {
	const settings: Partial<Record<keyof BaileysPrivacySettings, string>> = {};
	for (const [key, category] of Object.entries(PRIVACY_CATEGORIES)) {
		const value = raw[category];
		if (value !== undefined) {
			settings[key as keyof BaileysPrivacySettings] = value;
		}
	}
	return settings as Partial<BaileysPrivacySettings>;
}
