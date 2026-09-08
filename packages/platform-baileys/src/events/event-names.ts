import type { BaileysEvent } from "@whiskeysockets/baileys";
import { DERIVED_CONNECTION_EVENTS, NESTWHATS_ADAPTER_EVENTS } from "nestwhats";

/**
 * Every event Baileys emits, by its native name.
 *
 * Baileys declares its events as a type (`BaileysEventMap`) with no runtime
 * enum behind it, so the names cannot be read off the library the way
 * platform-whatsapp-web.js reads `Events`. This list is the runtime side, and
 * the check at the bottom of the file is what keeps it honest: an event added
 * upstream and missing here is a compile error naming the event.
 */
export const BAILEYS_EVENTS = [
	"connection.update",
	"creds.update",
	"messaging-history.set",
	"messaging-history.status",
	"chats.upsert",
	"chats.update",
	"lid-mapping.update",
	"chats.delete",
	"presence.update",
	"contacts.upsert",
	"contacts.update",
	"messages.delete",
	"messages.update",
	"messages.media-update",
	"messages.upsert",
	"messages.reaction",
	"message-receipt.update",
	"groups.upsert",
	"groups.update",
	"group-participants.update",
	"group.join-request",
	"group.member-tag.update",
	"blocklist.set",
	"blocklist.update",
	"call",
	"labels.edit",
	"labels.association",
	"newsletter.reaction",
	"newsletter.view",
	"newsletter-participants.update",
	"newsletter-settings.update",
	"message-capping.update",
	"chats.lock",
	"settings.update",
] as const satisfies readonly BaileysEvent[];

type Assert<T extends true> = T;

/**
 * Every key of `BaileysEventMap` must be in the list above. When the dependency
 * adds one, this line stops compiling and the error names the event that is
 * missing.
 */
export type EveryNativeEventIsListed = Assert<
	[Exclude<BaileysEvent, (typeof BAILEYS_EVENTS)[number]>] extends [never]
		? true
		: Exclude<BaileysEvent, (typeof BAILEYS_EVENTS)[number]>
>;

/** `message-receipt.update` -> `messageReceiptUpdate` */
export function toNestWhatsEventName(nativeEvent: string): string {
	return nativeEvent.replace(/[.-]([a-z])/g, (_, char: string) =>
		char.toUpperCase(),
	);
}

/**
 * The events the core owns: the two of the contract, the ones it derives from
 * `connectionUpdate`, and the two portable ones this adapter emits itself.
 *
 * A native event whose NestWhats spelling lands on one of these is that
 * event's *source* — `connection.update` becomes `connectionUpdate`,
 * `presence.update` becomes `presenceUpdate` — and is not forwarded under its
 * own name too: the same name carrying Baileys' shape on one emit and the
 * portable shape on the next would be worse than either alone. The raw update
 * stays reachable through `raw.ev`.
 */
export const PORTABLE_EVENTS: ReadonlySet<string> = new Set<string>([
	...NESTWHATS_ADAPTER_EVENTS,
	...DERIVED_CONNECTION_EVENTS,
	"messageStatus",
	"presenceUpdate",
]);

/**
 * Native event name -> NestWhats event name, for the events forwarded as they
 * are. Derived from {@link BAILEYS_EVENTS}, so the only thing listed by hand is
 * the native list itself.
 */
export const NATIVE_TO_NESTWHATS: ReadonlyMap<BaileysEvent, string> = new Map(
	BAILEYS_EVENTS.filter(
		(nativeEvent) => !PORTABLE_EVENTS.has(toNestWhatsEventName(nativeEvent)),
	).map((nativeEvent) => [nativeEvent, toNestWhatsEventName(nativeEvent)]),
);

/** Events this adapter emits that come from no Baileys event. */
export const ADAPTER_OWN_EVENTS = [
	"passkeyChallenge",
	"passkeyResult",
	"pollVote",
] as const;

/**
 * The NestWhats contract plus every native event, in NestWhats spelling.
 *
 * `messageStatus` and `presenceUpdate` are listed explicitly: they are
 * portable events this adapter derives from `messages.update`,
 * `message-receipt.update` and `presence.update`, so they are in neither
 * source. The passkey events are the adapter's own.
 */
export const SUPPORTED_EVENTS: ReadonlySet<string> = new Set<string>([
	...NESTWHATS_ADAPTER_EVENTS,
	"messageStatus",
	"presenceUpdate",
	...ADAPTER_OWN_EVENTS,
	...NATIVE_TO_NESTWHATS.values(),
]);
