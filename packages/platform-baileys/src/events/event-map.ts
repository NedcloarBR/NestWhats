import type { BaileysEvent, BaileysEventMap } from "@whiskeysockets/baileys";
import type {
	DERIVED_CONNECTION_EVENTS,
	NestWhatsAdapterEvent,
	NestWhatsBaseEvents,
} from "nestwhats";
import type {
	PasskeyChallenge,
	PasskeyResult,
} from "../passkey/passkey-handshake.js";
import type { BaileysPollVote } from "../structures/poll.js";

/** One delimiter at a time, so `message-receipt.update` resolves in one spelling. */
type CamelCase<
	S extends string,
	D extends string,
> = S extends `${infer Head}${D}${infer Tail}`
	? `${Head}${Capitalize<CamelCase<Tail, D>>}`
	: S;

/** `message-receipt.update` -> `messageReceiptUpdate`, at the type level. */
export type NestWhatsEventNameOf<E extends string> = CamelCase<
	CamelCase<E, "-">,
	"."
>;

/**
 * The type-level twin of `PORTABLE_EVENTS`: names the core owns, which a
 * native event is not forwarded under. `messageStatus` and `presenceUpdate`
 * are spelled out because the core exports no list of them.
 */
type PortableEventName =
	| NestWhatsAdapterEvent
	| (typeof DERIVED_CONNECTION_EVENTS)[number]
	| "messageStatus"
	| "presenceUpdate";

/**
 * Argument tuples for the events Baileys adds on top of the NestWhats base
 * set, derived from `BaileysEventMap` so an event added upstream is typed as
 * soon as the dependency is bumped.
 *
 * Every native event carries a single payload, forwarded untouched — the
 * `messages` inside `messagesUpsert` are Baileys' own `WAMessage`s, not
 * `BaileysMessage`. The portable `messageUpsert` is where the wrapped one
 * arrives.
 */
export type BaileysSpecificEvents = {
	[K in BaileysEvent as Exclude<NestWhatsEventNameOf<K>, PortableEventName>]: [
		payload: BaileysEventMap[K],
	];
};

/**
 * Events this adapter emits that come from no Baileys event: the passkey
 * pairing flow, which Baileys does not know about at all.
 */
export interface BaileysAdapterOwnEvents {
	/**
	 * WhatsApp asked for the account's passkey and no signer is configured.
	 * Answer with `challenge.resolve(assertion)`, or later through
	 * `resolvePasskey`.
	 */
	passkeyChallenge: [challenge: PasskeyChallenge];
	/** How a passkey pairing ended. */
	passkeyResult: [result: PasskeyResult];
	/**
	 * Someone voted on a poll this client sent or received.
	 *
	 * A vote is encrypted against the poll it answers, so this only fires
	 * while that poll is still in the message cache — and the whole tally is
	 * reported, since that is what WhatsApp sends.
	 */
	pollVote: [vote: BaileysPollVote];
}

/**
 * Every event available on a client backed by this adapter: the NestWhats base
 * set plus what Baileys adds. This is what `@BaileysOn` accepts.
 */
export type BaileysEvents = NestWhatsBaseEvents &
	BaileysSpecificEvents &
	BaileysAdapterOwnEvents;

/**
 * `call` is left out of the global augmentation on purpose. The whatsapp-web.js
 * package declares an event of the same name with its own payload, and two
 * augmentations of `NestWhatsBaseEvents` disagreeing on one property is a
 * compile error in any application that installs both platforms. The event is
 * still emitted, and `@BaileysOn('call')` types it; only `@On('call')` does not
 * know Baileys' shape.
 */
type SharedWithOtherPlatforms = "call";

declare module "nestwhats" {
	interface NestWhatsBaseEvents
		extends Omit<BaileysSpecificEvents, SharedWithOtherPlatforms>,
			BaileysAdapterOwnEvents {}
}
