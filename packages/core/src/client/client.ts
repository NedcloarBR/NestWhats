import { EventEmitter } from "node:events";
import type {
	NestWhatsAdapter,
	NestWhatsAdapterInfo,
} from "../adapter/adapter.interface.js";
import type { AdapterPlatform } from "../adapter/adapter-platform.js";
import {
	AdapterCapability,
	DERIVED_CONNECTION_EVENTS,
	type PostStatusOptions,
	type PresenceState,
	requireCapability,
	supportsCapability,
} from "../adapter/index.js";
import type {
	NestWhatsEventHandler,
	NestWhatsEvents,
} from "../listeners/listener.interface.js";
import type {
	NestWhatsChat,
	NestWhatsContact,
	NestWhatsMedia,
	NestWhatsMessage,
	NestWhatsMessageContent,
} from "../structures/index.js";

/** Events the core emits itself, rather than the adapter. */
const DERIVED: ReadonlySet<string> = new Set(DERIVED_CONNECTION_EVENTS);

/** What the module knows about a client beyond its adapter. */
export interface NestWhatsClientMeta<TOptions = Record<string, unknown>> {
	/**
	 * The options this client was built with — its own, merged over the
	 * factory's. Read-only in the useful sense too: they were baked into the
	 * adapter at `create`, so changing them means recreating the client, which
	 * is what `NestWhatsClientManagerService.updateClient` does.
	 */
	options?: TOptions;
	/** Which platform is behind it, from the factory. */
	platform?: AdapterPlatform;
	/** Id of the factory that built the adapter. */
	adapterId?: string;
}

/**
 * A named client: the adapter, how it was configured, and the events the core
 * derives from it.
 *
 * Injected with `@InjectClient('name')`, or `@Client()` in a handler. Name the
 * adapter's option type to read `options` without a cast:
 *
 * ```typescript
 * constructor(
 *   @InjectClient('personal')
 *   private readonly client: NestWhatsClient<WhatsAppWebJsAdapterOptions>,
 * ) {}
 * ```
 *
 * The sending methods mirror `NestWhatsMessagingService`, which resolves a
 * client by name before doing the same thing — use that one when the client is
 * chosen at runtime, and this one when it was injected. Both refuse an
 * unsupported operation in the same words; ask `supports()` first when the
 * answer should change what you do.
 */
export class NestWhatsClient<TOptions = Record<string, unknown>> {
	/**
	 * Events the core derives from the adapter's `connectionUpdate`, so handlers
	 * keep the ergonomic names while adapters only report state.
	 */
	public readonly events = new EventEmitter();

	/** The options this client was built with; empty when it passed none. */
	public readonly options: TOptions;
	/** Which platform is behind it, known before the adapter connects. */
	public readonly platform?: AdapterPlatform;
	/** Id of the factory that built the adapter. */
	public readonly adapterId?: string;

	public constructor(
		public readonly name: string,
		public readonly adapter: NestWhatsAdapter,
		meta: NestWhatsClientMeta<TOptions> = {},
	) {
		this.options = meta.options ?? ({} as TOptions);
		this.platform = meta.platform;
		this.adapterId = meta.adapterId;
	}

	/** Who is connected, or `undefined` before the platform can say. */
	public getInfo(): NestWhatsAdapterInfo | undefined {
		return this.adapter.getInfo();
	}

	/** Whether this client's adapter announces a capability. */
	public supports(capability: AdapterCapability): boolean {
		return supportsCapability(this.adapter, capability);
	}

	/**
	 * Subscribes to one of this client's events. Returns the function that
	 * unsubscribes.
	 *
	 * Which emitter an event lives on — the core for the derived ones, the
	 * adapter for everything the platform owns — is decided here, so a caller
	 * never has to know.
	 */
	public on<K extends keyof NestWhatsEvents>(
		event: K,
		handler: NestWhatsEventHandler<K>,
	): () => void {
		this.assertSupportedEvent(event as string);
		const listener = handler as (...args: unknown[]) => void;
		this.emitterFor(event as string).on(event as string, listener);
		return () => this.off(event, handler);
	}

	/** Subscribes until the event fires once. */
	public once<K extends keyof NestWhatsEvents>(
		event: K,
		handler: NestWhatsEventHandler<K>,
	): void {
		this.assertSupportedEvent(event as string);
		this.emitterFor(event as string).once(
			event as string,
			handler as (...args: unknown[]) => void,
		);
	}

	/** Drops a subscription made with `on` or `once`. */
	public off<K extends keyof NestWhatsEvents>(
		event: K,
		handler: NestWhatsEventHandler<K>,
	): void {
		this.emitterFor(event as string).off(
			event as string,
			handler as (...args: unknown[]) => void,
		);
	}

	/**
	 * Text, or media on a platform that supports it.
	 *
	 * Every sending method here is `async` on purpose: a capability this
	 * platform lacks comes back as a rejected promise, so one `.catch` covers
	 * both that and a failure on the wire.
	 */
	public async sendMessage(
		chatId: string,
		content: NestWhatsMessageContent,
	): Promise<NestWhatsMessage> {
		if (typeof content === "string")
			return this.adapter.sendMessage(chatId, content);
		return this.sendMedia(chatId, content);
	}

	/** Requires `SendMedia`. */
	public async sendMedia(
		chatId: string,
		media: NestWhatsMedia,
	): Promise<NestWhatsMessage> {
		return this.require(AdapterCapability.SendMedia, "sendMedia")(
			chatId,
			media,
		);
	}

	/** Typing or recording indicator; requires `Presence`. */
	public async sendPresence(
		chatId: string,
		state: PresenceState,
	): Promise<void> {
		await this.require(AdapterCapability.Presence, "sendPresence")(
			chatId,
			state,
		);
	}

	/** Marks the chat as read; requires `ReadReceipts`. */
	public async sendSeen(chatId: string): Promise<void> {
		await this.require(AdapterCapability.ReadReceipts, "sendSeen")(chatId);
	}

	/** Deletes a message for everyone; requires `Revoke`. */
	public async revokeMessage(messageId: string): Promise<void> {
		await this.require(AdapterCapability.Revoke, "revokeMessage")(messageId);
	}

	/** Lists the conversations this client knows about; requires `ListChats`. */
	public async getChats(): Promise<NestWhatsChat[]> {
		return this.require(AdapterCapability.ListChats, "getChats")();
	}

	/** Requires `ReadChat`. */
	public async getChat(chatId: string): Promise<NestWhatsChat | undefined> {
		return this.require(AdapterCapability.ReadChat, "getChat")(chatId);
	}

	/** Requires `ReadContact`. */
	public async getContact(
		contactId: string,
	): Promise<NestWhatsContact | undefined> {
		return this.require(AdapterCapability.ReadContact, "getContact")(contactId);
	}

	/**
	 * Drops the credentials, not just the connection — the client has to
	 * authenticate again. Requires `Logout`.
	 */
	public async logout(): Promise<void> {
		await this.require(AdapterCapability.Logout, "logout")();
	}

	/** Starts a group with this account and `participantIds`; requires `CreateGroup`. */
	public async createGroup(
		subject: string,
		participantIds: string[],
	): Promise<NestWhatsChat> {
		return this.require(AdapterCapability.CreateGroup, "createGroup")(
			subject,
			participantIds,
		);
	}

	/**
	 * Someone's profile text — "recado". `undefined` when they have none or it
	 * is hidden. Requires `ReadAbout`.
	 */
	public async getAbout(contactId: string): Promise<string | undefined> {
		return this.require(AdapterCapability.ReadAbout, "getAbout")(contactId);
	}

	/** Changes this account's own profile text; requires `SetAbout`. */
	public async setAbout(text: string): Promise<void> {
		await this.require(AdapterCapability.SetAbout, "setAbout")(text);
	}

	/** Changes this account's display name; requires `SetProfileName`. */
	public async setProfileName(name: string): Promise<void> {
		await this.require(
			AdapterCapability.SetProfileName,
			"setProfileName",
		)(name);
	}

	/** Changes this account's photo; requires `SetProfilePicture`. */
	public async setProfilePicture(media: NestWhatsMedia): Promise<void> {
		await this.require(
			AdapterCapability.SetProfilePicture,
			"setProfilePicture",
		)(media);
	}

	/** Blocks or unblocks a contact; requires `Block`. */
	public async setBlocked(contactId: string, blocked: boolean): Promise<void> {
		await this.require(AdapterCapability.Block, "setBlocked")(
			contactId,
			blocked,
		);
	}

	/**
	 * Publishes to status/stories rather than into a chat; requires
	 * `PostStatus`.
	 */
	public async postStatus(
		content: NestWhatsMessageContent,
		options?: PostStatusOptions,
	): Promise<NestWhatsMessage> {
		return this.require(AdapterCapability.PostStatus, "postStatus")(
			content,
			options,
		);
	}

	/**
	 * Asks to be told when a contact comes and goes; requires
	 * `SubscribePresence`.
	 *
	 * The answers arrive as `presenceUpdate` events, carrying "last seen at"
	 * when privacy allows. Subscriptions do not survive a reconnect, so
	 * resubscribe on `ready`.
	 */
	public async subscribePresence(contactId: string): Promise<void> {
		await this.require(
			AdapterCapability.SubscribePresence,
			"subscribePresence",
		)(contactId);
	}

	/** The platform's own client object, untouched. */
	public get raw(): unknown {
		return this.adapter.raw;
	}

	/**
	 * Derived events come from the core, so they are on `events`; everything
	 * else is the platform's and comes straight off the adapter.
	 */
	private emitterFor(event: string): {
		on(event: string, listener: (...args: unknown[]) => void): unknown;
		once(event: string, listener: (...args: unknown[]) => void): unknown;
		off(event: string, listener: (...args: unknown[]) => void): unknown;
	} {
		return DERIVED.has(event) ? this.events : this.adapter;
	}

	/**
	 * Only the platform's own events are checked against `supportedEvents`: the
	 * derived ones are emitted by the core whatever the adapter declares.
	 */
	private assertSupportedEvent(event: string): void {
		if (DERIVED.has(event)) return;
		if (this.adapter.supportedEvents?.has(event) === false) {
			throw new Error(
				`[NestWhats] Event "${event}" is not supported by the adapter of client "${this.name}"`,
			);
		}
	}

	/** Binds a capability's method to the adapter, or throws naming it. */
	private require<K extends keyof NestWhatsAdapter>(
		capability: AdapterCapability,
		method: K,
	): NonNullable<NestWhatsAdapter[K]> {
		const fn = requireCapability(
			this.adapter,
			capability,
			method,
			this.name,
			this.platform?.id,
		) as NonNullable<NestWhatsAdapter[K]> & ((...args: never[]) => unknown);
		return fn.bind(this.adapter) as NonNullable<NestWhatsAdapter[K]>;
	}
}
