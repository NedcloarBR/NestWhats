import type {
	NestWhatsChat,
	NestWhatsContact,
	NestWhatsMedia,
	NestWhatsMessage,
	NestWhatsMessageContent,
} from "../structures/index.js";
import type {
	AdapterCapability,
	PostStatusOptions,
	PresenceState,
} from "./index.js";

/** Who the connected account is, once the platform can say. */
export interface NestWhatsAdapterInfo {
	/** Canonical id of the connected account. */
	id: string;
	/** Name the account publishes about itself. */
	displayName?: string;
	/** Phone number in international form, when the platform exposes it. */
	phone?: string;
}

/**
 * Event listener shape.
 *
 * `any[]` is deliberate and has to stay: adapters extend Node's `EventEmitter`,
 * whose `on` is declared this way, and any narrower signature would stop
 * `class X extends EventEmitter implements NestWhatsAdapter` from compiling.
 * The typed surface lives in `NestWhatsEvents`, which is what handlers use.
 */
export type AdapterEventListener = (...args: any[]) => void;

/**
 * Contract a platform package implements to plug into NestWhats.
 *
 * `TRaw` is the platform's own client object, surfaced through `raw` and
 * carried into every structure this adapter produces. What configures the
 * platform is typed on its `NestWhatsAdapterFactory` instead.
 *
 * An adapter is one client's connection and nothing else — configuring a
 * platform and building its adapters is the factory's job. The mandatory
 * block is what every platform can honour — connect, disconnect, emit events,
 * say who it is, send text. Everything below it is optional because platforms
 * genuinely differ — the official Cloud API has no way to fetch a chat or a
 * contact, whatever the onboarding — and implementing a method is what
 * announces the matching `AdapterCapability`.
 */
export interface NestWhatsAdapter<TRaw = unknown> {
	/**
	 * Connects, and keeps emitting `connectionUpdate` until it is ready.
	 *
	 * Must be callable more than once: the core calls it again to reconnect, so
	 * a second call has to build a working connection rather than resume a dead
	 * one, and must not leave the previous attempt's listeners behind.
	 */
	initialize(): Promise<void>;
	/**
	 * Closes the connection and releases whatever it holds — a browser, a
	 * socket, a timer. Called on shutdown, and expected to be idempotent.
	 */
	destroy(): Promise<void>;
	on(event: string, listener: AdapterEventListener): this;
	once(event: string, listener: AdapterEventListener): this;
	off(event: string, listener: AdapterEventListener): this;
	/** Who is connected, or `undefined` before the platform can say. */
	getInfo(): NestWhatsAdapterInfo | undefined;
	/**
	 * Sends text.
	 *
	 * Here rather than optional because it is the operation a WhatsApp adapter
	 * exists for, not because every platform can always do it: the official
	 * Cloud API refuses free-form text outside the 24-hour service window and
	 * accepts only an approved template. That is a per-chat, time-dependent
	 * precondition no capability flag can express, so it surfaces as a failed
	 * call.
	 *
	 * `chatId` arrives canonical; convert it at this boundary.
	 */
	sendMessage(chatId: string, content: string): Promise<NestWhatsMessage>;

	/** `AdapterCapability.SendMedia`. */
	sendMedia?(chatId: string, media: NestWhatsMedia): Promise<NestWhatsMessage>;
	/** `AdapterCapability.ReadChat`. */
	getChat?(chatId: string): Promise<NestWhatsChat | undefined>;
	/** `AdapterCapability.ReadContact`. */
	getContact?(contactId: string): Promise<NestWhatsContact | undefined>;
	/** `AdapterCapability.ListChats`. */
	getChats?(): Promise<NestWhatsChat[]>;
	/** `AdapterCapability.Presence`. */
	sendPresence?(chatId: string, state: PresenceState): Promise<void>;
	/** `AdapterCapability.ReadReceipts`. */
	sendSeen?(chatId: string): Promise<void>;
	/** `AdapterCapability.Revoke`. */
	revokeMessage?(messageId: string): Promise<void>;
	/** `AdapterCapability.Logout`. */
	logout?(): Promise<void>;

	/**
	 * `AdapterCapability.CreateGroup`.
	 *
	 * @param subject - the group's name.
	 * @param participantIds - canonical ids to add, besides this account.
	 */
	createGroup?(
		subject: string,
		participantIds: string[],
	): Promise<NestWhatsChat>;
	/**
	 * `AdapterCapability.ReadAbout` — the contact's profile text, what the app
	 * calls "recado". `undefined` when they have none or it is hidden.
	 */
	getAbout?(contactId: string): Promise<string | undefined>;
	/** `AdapterCapability.SetAbout` — this account's own profile text. */
	setAbout?(text: string): Promise<void>;
	/** `AdapterCapability.SetProfileName`. */
	setProfileName?(name: string): Promise<void>;
	/** `AdapterCapability.SetProfilePicture`. */
	setProfilePicture?(media: NestWhatsMedia): Promise<void>;
	/** `AdapterCapability.Block`. */
	setBlocked?(contactId: string, blocked: boolean): Promise<void>;
	/**
	 * `AdapterCapability.PostStatus` — publishes to status/stories rather than
	 * into a chat.
	 *
	 * @param content - text or media, as a chat message would take.
	 * @param options - who may see it; the platform's own default when omitted.
	 */
	postStatus?(
		content: NestWhatsMessageContent,
		options?: PostStatusOptions,
	): Promise<NestWhatsMessage>;
	/**
	 * `AdapterCapability.SubscribePresence` — asks to be told when a contact
	 * comes and goes.
	 *
	 * Nothing is returned: the answers arrive as `presenceUpdate` events, which
	 * is how every platform that has this models it. A subscription normally
	 * lasts as long as the connection, so call it again after a reconnect.
	 */
	subscribePresence?(contactId: string): Promise<void>;

	/** Events this adapter emits; used to validate dynamic bindings. */
	readonly supportedEvents?: ReadonlySet<string>;
	/**
	 * Capabilities to report as unsupported even though the method is there.
	 *
	 * For the case where implementing something is not the same as being able
	 * to use it: the same adapter class serving an account onboarded one way
	 * can do less than one onboarded another, and only the instance knows.
	 *
	 * It can only subtract. There is deliberately no way to claim a capability
	 * without implementing it, and a capability added to the core later is
	 * derived for every adapter rather than quietly reported as missing.
	 */
	readonly unsupported?: ReadonlySet<AdapterCapability>;
	/** The platform's own client object, untouched. */
	readonly raw: TRaw;
}
