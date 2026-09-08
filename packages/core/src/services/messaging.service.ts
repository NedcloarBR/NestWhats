import { Injectable } from "@nestjs/common";
import type { NestWhatsAdapter } from "../adapter/adapter.interface.js";
import {
	AdapterCapability,
	DERIVED_CONNECTION_EVENTS,
	type PostStatusOptions,
	type PresenceState,
	requireCapability,
	supportsCapability,
} from "../adapter/index.js";
import { ClientsRegistryService } from "../client/clients-registry.service.js";
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

/** Which client a messaging call acts on. */
export interface MessagingOptions {
	/** Which client to act as; the default one when omitted. */
	client?: string;
}

/** Events the core emits itself, rather than the adapter. */
const DERIVED: ReadonlySet<string> = new Set(DERIVED_CONNECTION_EVENTS);

/**
 * Sending and subscribing from anywhere in the application, on any adapter.
 *
 * Text works everywhere; media, presence, read receipts, revokes and lookups
 * are gated by what the client's adapter implements, and calling one it lacks
 * throws with the capability named. Ask first with `supports()` when the answer
 * should change what you do.
 */
@Injectable()
export class NestWhatsMessagingService {
	public constructor(protected readonly registry: ClientsRegistryService) {}

	protected getAdapter(clientName?: string): NestWhatsAdapter {
		const adapter = this.registry.get(clientName);
		if (!adapter) {
			const registered = this.registry.getAll().map((e) => e.name);
			throw new Error(
				`[NestWhats] Client "${clientName ?? "default"}" not found${
					registered.length
						? ` — registered clients: ${registered.join(", ")}`
						: " — no clients are registered"
				}`,
			);
		}
		return adapter;
	}

	/**
	 * Only the platform's own events are checked against `supportedEvents`: the
	 * derived ones are emitted by the core whatever the adapter declares, and an
	 * adapter that lists its native events has no reason to list those too.
	 */
	protected assertSupportedEvent(
		adapter: NestWhatsAdapter,
		event: string,
		clientName?: string,
	): void {
		if (DERIVED.has(event)) return;
		if (adapter.supportedEvents?.has(event) === false) {
			throw new Error(
				`[NestWhats] Event "${event}" is not supported by the adapter of client "${clientName ?? "default"}"`,
			);
		}
	}

	/**
	 * Returns the method behind a capability, or explains that this platform
	 * does not have it.
	 *
	 * Delegates to the shared `requireCapability` so this service and
	 * `NestWhatsClient` refuse in the same words; kept as a method because it is
	 * `protected` and a subclass may already be leaning on it.
	 */
	protected requireCapability<K extends keyof NestWhatsAdapter>(
		adapter: NestWhatsAdapter,
		capability: AdapterCapability,
		method: K,
		clientName?: string,
	): NonNullable<NestWhatsAdapter[K]> {
		return requireCapability(
			adapter,
			capability,
			method,
			clientName,
			this.registry.getEntry(clientName)?.platform?.id,
		);
	}

	/** Whether the client's adapter announces a capability. */
	public supports(
		capability: AdapterCapability,
		options?: MessagingOptions,
	): boolean {
		return supportsCapability(this.getAdapter(options?.client), capability);
	}

	public on<K extends keyof NestWhatsEvents>(
		event: K,
		handler: NestWhatsEventHandler<K>,
		options?: MessagingOptions,
	): () => void {
		const adapter = this.getAdapter(options?.client);
		this.assertSupportedEvent(adapter, event as string, options?.client);
		adapter.on(event as string, handler as (...args: unknown[]) => void);
		return () =>
			adapter.off(event as string, handler as (...args: unknown[]) => void);
	}

	public once<K extends keyof NestWhatsEvents>(
		event: K,
		handler: NestWhatsEventHandler<K>,
		options?: MessagingOptions,
	): void {
		const adapter = this.getAdapter(options?.client);
		this.assertSupportedEvent(adapter, event as string, options?.client);
		adapter.once(event as string, handler as (...args: unknown[]) => void);
	}

	public off<K extends keyof NestWhatsEvents>(
		event: K,
		handler: NestWhatsEventHandler<K>,
		options?: MessagingOptions,
	): void {
		const adapter = this.getAdapter(options?.client);
		adapter.off(event as string, handler as (...args: unknown[]) => void);
	}

	/** Text, or media on a platform that supports it. */
	public async sendMessage(
		chatId: string,
		content: NestWhatsMessageContent,
		options?: MessagingOptions,
	): Promise<NestWhatsMessage> {
		const adapter = this.getAdapter(options?.client);
		if (typeof content === "string")
			return adapter.sendMessage(chatId, content);
		return this.sendMedia(chatId, content, options);
	}

	/** Requires `SendMedia`. */
	public async sendMedia(
		chatId: string,
		media: NestWhatsMedia,
		options?: MessagingOptions,
	): Promise<NestWhatsMessage> {
		const adapter = this.getAdapter(options?.client);
		const send = this.requireCapability(
			adapter,
			AdapterCapability.SendMedia,
			"sendMedia",
			options?.client,
		);
		return send.call(adapter, chatId, media);
	}

	/** Typing or recording indicator; requires `Presence`. */
	public async sendPresence(
		chatId: string,
		state: PresenceState,
		options?: MessagingOptions,
	): Promise<void> {
		const adapter = this.getAdapter(options?.client);
		const send = this.requireCapability(
			adapter,
			AdapterCapability.Presence,
			"sendPresence",
			options?.client,
		);
		await send.call(adapter, chatId, state);
	}

	/** Marks the chat as read; requires `ReadReceipts`. */
	public async sendSeen(
		chatId: string,
		options?: MessagingOptions,
	): Promise<void> {
		const adapter = this.getAdapter(options?.client);
		const send = this.requireCapability(
			adapter,
			AdapterCapability.ReadReceipts,
			"sendSeen",
			options?.client,
		);
		await send.call(adapter, chatId);
	}

	/** Deletes a message for everyone; requires `Revoke`. */
	public async revokeMessage(
		messageId: string,
		options?: MessagingOptions,
	): Promise<void> {
		const adapter = this.getAdapter(options?.client);
		const revoke = this.requireCapability(
			adapter,
			AdapterCapability.Revoke,
			"revokeMessage",
			options?.client,
		);
		await revoke.call(adapter, messageId);
	}

	/** Lists the conversations the client knows about; requires `ListChats`. */
	public async getChats(options?: MessagingOptions): Promise<NestWhatsChat[]> {
		const adapter = this.getAdapter(options?.client);
		const list = this.requireCapability(
			adapter,
			AdapterCapability.ListChats,
			"getChats",
			options?.client,
		);
		return list.call(adapter);
	}

	/** Requires `ReadChat`. */
	public async getChat(
		chatId: string,
		options?: MessagingOptions,
	): Promise<NestWhatsChat | undefined> {
		const adapter = this.getAdapter(options?.client);
		const read = this.requireCapability(
			adapter,
			AdapterCapability.ReadChat,
			"getChat",
			options?.client,
		);
		return read.call(adapter, chatId);
	}

	/**
	 * Drops the credentials of a client, not just its connection; requires
	 * `Logout`.
	 */
	public async logout(options?: MessagingOptions): Promise<void> {
		const adapter = this.getAdapter(options?.client);
		const logout = this.requireCapability(
			adapter,
			AdapterCapability.Logout,
			"logout",
			options?.client,
		);
		await logout.call(adapter);
	}

	/** Requires `ReadContact`. */
	public async getContact(
		contactId: string,
		options?: MessagingOptions,
	): Promise<NestWhatsContact | undefined> {
		const adapter = this.getAdapter(options?.client);
		const read = this.requireCapability(
			adapter,
			AdapterCapability.ReadContact,
			"getContact",
			options?.client,
		);
		return read.call(adapter, contactId);
	}

	/** Starts a group; requires `CreateGroup`. */
	public async createGroup(
		subject: string,
		participantIds: string[],
		options?: MessagingOptions,
	): Promise<NestWhatsChat> {
		const adapter = this.getAdapter(options?.client);
		const create = this.requireCapability(
			adapter,
			AdapterCapability.CreateGroup,
			"createGroup",
			options?.client,
		);
		return create.call(adapter, subject, participantIds);
	}

	/** Someone's profile text — "recado"; requires `ReadAbout`. */
	public async getAbout(
		contactId: string,
		options?: MessagingOptions,
	): Promise<string | undefined> {
		const adapter = this.getAdapter(options?.client);
		const read = this.requireCapability(
			adapter,
			AdapterCapability.ReadAbout,
			"getAbout",
			options?.client,
		);
		return read.call(adapter, contactId);
	}

	/** Changes the client's own profile text; requires `SetAbout`. */
	public async setAbout(
		text: string,
		options?: MessagingOptions,
	): Promise<void> {
		const adapter = this.getAdapter(options?.client);
		const set = this.requireCapability(
			adapter,
			AdapterCapability.SetAbout,
			"setAbout",
			options?.client,
		);
		await set.call(adapter, text);
	}

	/** Changes the client's display name; requires `SetProfileName`. */
	public async setProfileName(
		name: string,
		options?: MessagingOptions,
	): Promise<void> {
		const adapter = this.getAdapter(options?.client);
		const set = this.requireCapability(
			adapter,
			AdapterCapability.SetProfileName,
			"setProfileName",
			options?.client,
		);
		await set.call(adapter, name);
	}

	/** Changes the client's photo; requires `SetProfilePicture`. */
	public async setProfilePicture(
		media: NestWhatsMedia,
		options?: MessagingOptions,
	): Promise<void> {
		const adapter = this.getAdapter(options?.client);
		const set = this.requireCapability(
			adapter,
			AdapterCapability.SetProfilePicture,
			"setProfilePicture",
			options?.client,
		);
		await set.call(adapter, media);
	}

	/** Blocks or unblocks a contact; requires `Block`. */
	public async setBlocked(
		contactId: string,
		blocked: boolean,
		options?: MessagingOptions,
	): Promise<void> {
		const adapter = this.getAdapter(options?.client);
		const set = this.requireCapability(
			adapter,
			AdapterCapability.Block,
			"setBlocked",
			options?.client,
		);
		await set.call(adapter, contactId, blocked);
	}

	/** Publishes to status/stories rather than a chat; requires `PostStatus`. */
	public async postStatus(
		content: NestWhatsMessageContent,
		statusOptions?: PostStatusOptions,
		options?: MessagingOptions,
	): Promise<NestWhatsMessage> {
		const adapter = this.getAdapter(options?.client);
		const post = this.requireCapability(
			adapter,
			AdapterCapability.PostStatus,
			"postStatus",
			options?.client,
		);
		return post.call(adapter, content, statusOptions);
	}

	/**
	 * Asks to be told when a contact comes and goes; requires
	 * `SubscribePresence`. The answers arrive as `presenceUpdate` events.
	 */
	public async subscribePresence(
		contactId: string,
		options?: MessagingOptions,
	): Promise<void> {
		const adapter = this.getAdapter(options?.client);
		const subscribe = this.requireCapability(
			adapter,
			AdapterCapability.SubscribePresence,
			"subscribePresence",
			options?.client,
		);
		await subscribe.call(adapter, contactId);
	}
}
