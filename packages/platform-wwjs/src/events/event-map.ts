import type { NestWhatsBaseEvents } from "nestwhats";
import type {
	BatteryInfo,
	Call,
	Chat,
	Events,
	GroupNotification,
	MessageAck,
	PollVote,
	Reaction,
	WAState,
} from "whatsapp-web.js";
import type { WWebJsMessage } from "../structures/index.js";

/**
 * Argument tuples for the events whatsapp-web.js adds on top of the NestWhats
 * base set.
 *
 * These are declared by hand on purpose: whatsapp-web.js types `Client.on`
 * through overloads rather than an event map, and TypeScript cannot extract
 * overload signatures. The completeness check at the bottom of this file makes
 * the omission of a new event a compile error instead of silent drift.
 */
export interface WWebJsSpecificEvents {
	/** whatsapp-web.js splits received (`message`) from any created message
	 * (`messageCreate`); the portable `messageUpsert` carries the latter. */
	message: [message: WWebJsMessage];
	/** Any message created, including ones this client sent. */
	messageCreate: [message: WWebJsMessage];
	/** Credentials were rejected; the session has to be created again. */
	authFailure: [message: string];
	/** An incoming call. Declared by whatsapp-web.js as `call`, emitted as `incoming_call`. */
	call: [call: Call];
	/** Phone battery level changed. Only reported by older WhatsApp versions. */
	changeBattery: [batteryInfo: BatteryInfo];
	/** The underlying WhatsApp Web connection state changed. */
	changeState: [state: WAState];
	/** A chat was archived or unarchived. */
	chatArchived: [chat: Chat, currState: boolean, prevState: boolean];
	/** A chat was deleted. */
	chatRemoved: [chat: Chat];
	/** Pairing code received. The portable `pairingCode` carries the same value. */
	code: [code: string];
	/** A contact changed its number, and messages moved to the new id. */
	contactChanged: [
		message: WWebJsMessage,
		oldId: string,
		newId: string,
		isContact: string,
	];
	/** Someone was promoted to or demoted from group admin. */
	groupAdminChanged: [notification: GroupNotification];
	/** Someone joined a group this account is in. */
	groupJoin: [notification: GroupNotification];
	/** Someone left or was removed from a group. */
	groupLeave: [notification: GroupNotification];
	/** Someone asked to join a group that requires admin approval. */
	groupMembershipRequest: [notification: GroupNotification];
	/** A group's subject, description or settings changed. */
	groupUpdate: [notification: GroupNotification];
	/** Progress while WhatsApp Web loads, before the client is ready. */
	loadingScreen: [percent: string, message: string];
	/** Media finished uploading for a message this client sent. */
	mediaUploaded: [message: WWebJsMessage];
	/** Delivery state of a sent message advanced — sent, delivered, read. */
	messageAck: [message: WWebJsMessage, ack: MessageAck];
	/** A message arrived still encrypted, before it could be decrypted. */
	messageCiphertext: [message: WWebJsMessage];
	/** A message could not be decrypted and is lost. */
	messageCiphertextFailed: [message: WWebJsMessage];
	/** A message was edited by its sender. */
	messageEdit: [message: WWebJsMessage, newBody: string, prevBody: string];
	/** Someone reacted to a message, or removed their reaction. */
	messageReaction: [reaction: Reaction];
	/** A message was deleted for everyone. `revokedMsg` is null if it was not cached. */
	messageRevokeEveryone: [
		message: WWebJsMessage,
		revokedMsg: WWebJsMessage | null,
	];
	/** A message was deleted for this account only. */
	messageRevokeMe: [message: WWebJsMessage];
	/** A RemoteAuth strategy finished persisting the session. */
	remoteSessionSaved: [];
	/** A chat's unread count changed. */
	unreadCount: [chat: Chat];
	/** Someone voted on a poll. */
	voteUpdate: [vote: PollVote];
}

/**
 * Every event available on a client backed by this adapter: the NestWhats base
 * set plus what whatsapp-web.js adds. This is what `@WWebJsOn` accepts.
 */
export type WWebJsEvents = NestWhatsBaseEvents & WWebJsSpecificEvents;

declare module "nestwhats" {
	interface NestWhatsBaseEvents extends WWebJsSpecificEvents {}
}

/** `message_revoke_everyone` -> `messageRevokeEveryone`, at the type level. */
type CamelCase<S extends string> = S extends `${infer Head}_${infer Tail}`
	? `${Head}${Capitalize<CamelCase<Tail>>}`
	: S;

type NestWhatsEventNameOf<E extends string> = CamelCase<E>;

type Assert<T extends true> = T;

/**
 * Every event in the whatsapp-web.js `Events` enum must have a signature above.
 * When the dependency adds one, this line stops compiling and the error names
 * the event that is missing.
 */
export type EveryNativeEventIsTyped = Assert<
	[Exclude<NestWhatsEventNameOf<`${Events}`>, keyof WWebJsEvents>] extends [
		never,
	]
		? true
		: Exclude<NestWhatsEventNameOf<`${Events}`>, keyof WWebJsEvents>
>;
