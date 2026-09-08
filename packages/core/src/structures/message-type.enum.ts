/**
 * Message kinds every platform can report. A type with no portable equivalent
 * arrives as `Unknown`; the platform's own type is on `raw`.
 */
export enum NestWhatsMessageType {
	Text = "text",
	Image = "image",
	Video = "video",
	Audio = "audio",
	Voice = "voice",
	Sticker = "sticker",
	Document = "document",
	Location = "location",
	ContactCard = "contact_card",
	Poll = "poll",
	Revoked = "revoked",
	Unknown = "unknown",
}
