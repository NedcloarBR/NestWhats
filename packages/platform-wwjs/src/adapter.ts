import { EventEmitter } from "node:events";
import { Logger } from "@nestjs/common";
import {
	ClientStatus,
	type ConnectionUpdate,
	DisconnectKind,
	type NestWhatsAdapter,
	type NestWhatsAdapterInfo,
	type NestWhatsMedia,
	type NestWhatsMessageStatusUpdate,
	PresenceState,
} from "nestwhats";
import { toString as QRCodeString } from "qrcode";
import type { ClientOptions, Client as ClientType } from "whatsapp-web.js";
import {
	NATIVE_TO_NESTWHATS,
	SUPPORTED_EVENTS,
	toDisconnectReason,
	toMessageStatus,
} from "./events/index.js";
import { Client, Events, NativeMessage } from "./runtime.js";
import {
	toCanonicalJid,
	toNativeJid,
	toNativeMedia,
	toSendArgs,
	WWebJsChat,
	WWebJsContact,
	WWebJsMessage,
} from "./structures/index.js";

/** Native structures are swapped for their NestWhats counterparts. */
function toNestWhats(value: unknown): unknown {
	return NativeMessage && value instanceof NativeMessage
		? new WWebJsMessage(value)
		: value;
}

/**
 * Everything whatsapp-web.js' own `ClientOptions` accepts — `authStrategy`,
 * `puppeteer`, `pairWithPhoneNumber` and the rest — plus what this adapter adds.
 */
export interface WhatsAppWebJsAdapterOptions extends ClientOptions {
	/**
	 * Print whatever is needed to authenticate to the terminal: the QR code, or
	 * the pairing code when `pairWithPhoneNumber` is set. Defaults to true.
	 */
	printAuthData?: boolean;
}

/**
 * whatsapp-web.js waits this long for WhatsApp Web to finish loading before
 * throwing "auth timeout". Its own default is 30s, which assumes one client:
 * NestWhats starts several in parallel, each a separate browser competing for
 * CPU, and the second one routinely loses that race on modest hardware.
 */
const DEFAULT_AUTH_TIMEOUT_MS = 120_000;

/**
 * puppeteer's SIGINT handler calls `process.exit(130)`, which kills the app
 * before Nest can run its shutdown hooks. Nest owns the lifecycle here — the
 * browser is closed by `destroy()` — so the handlers are off unless opted in.
 */
function withNestManagedSignals(
	puppeteer: ClientOptions["puppeteer"],
): ClientOptions["puppeteer"] {
	return {
		handleSIGINT: false,
		handleSIGTERM: false,
		handleSIGHUP: false,
		...puppeteer,
	};
}

/**
 * NestWhats adapter backed by whatsapp-web.js, which drives a real WhatsApp Web
 * session in a headless browser.
 *
 * One of these serves one client. Build them with
 * {@link WhatsAppWebJsAdapterFactory}, which is what gives each client its own
 * session directory — constructing this directly is for tests and for code that
 * already knows which session it wants.
 *
 * Being a full session it supports almost every optional method the contract
 * has. The two it leaves out are the ones WhatsApp Web itself does not offer:
 * posting to status/stories, and subscribing to a contact's presence — so
 * `AdapterCapability.PostStatus` and `SubscribePresence` answer false here and
 * true on a socket platform like Baileys.
 *
 * The native `Client` stays reachable through `raw`.
 */
export class WhatsAppWebJsAdapter
	extends EventEmitter
	implements NestWhatsAdapter<ClientType>
{
	public readonly supportedEvents = SUPPORTED_EVENTS;
	// No `capabilities` override: this adapter drives a real WhatsApp Web
	// session and supports everything it implements, so the methods below are
	// the whole answer.
	private readonly logger = new Logger(WhatsAppWebJsAdapter.name);
	private readonly client: ClientType;
	private readonly printAuthData: boolean;
	private readonly authTimeoutMs: number;

	/**
	 * @param options - whatsapp-web.js client options, plus `printAuthData`.
	 * @param clientName - the client this serves; only used to label the QR and
	 * pairing code it prints, so several clients authenticating at once can be
	 * told apart in the terminal.
	 */
	public constructor(
		options: WhatsAppWebJsAdapterOptions = {},
		private readonly clientName?: string,
	) {
		super();
		const { printAuthData = true, ...clientOptions } = options;
		this.printAuthData = printAuthData;
		this.authTimeoutMs = clientOptions.authTimeoutMs || DEFAULT_AUTH_TIMEOUT_MS;
		this.client = new Client({
			...clientOptions,
			authTimeoutMs: this.authTimeoutMs,
			puppeteer: withNestManagedSignals(clientOptions.puppeteer),
		});
		this.bindClientEvents();
	}

	private bindClientEvents(): void {
		this.client.on(Events.QR_RECEIVED, (qr: string) => {
			if (this.printAuthData) {
				const label = this.clientName ? `[${this.clientName}] ` : "";
				QRCodeString(qr, { type: "terminal", small: true }, (err, url) => {
					if (err) {
						this.logger.error(
							`${label}Error generating QR code: ${err.message}`,
						);
						return;
					}
					this.logger.verbose(
						`${label}Scan the QR code below to authenticate:`,
					);
					console.log(url);
				});
			}
			this.emitConnection({ status: ClientStatus.QrReceived, qr });
		});

		// With pairWithPhoneNumber set, whatsapp-web.js never registers the QR
		// handler and emits a pairing code instead — it is the same waiting-to-be
		// authenticated state, so it has to reach the core the same way.
		this.client.on(Events.CODE_RECEIVED, (code: string) => {
			if (this.printAuthData) {
				const label = this.clientName ? `[${this.clientName}] ` : "";
				this.logger.verbose(`${label}Pairing code: ${code}`);
			}
			this.emitConnection({
				status: ClientStatus.PairingCodeReceived,
				pairingCode: code,
			});
		});

		this.client.on(Events.AUTHENTICATED, () =>
			this.emitConnection({ status: ClientStatus.Authenticated }),
		);
		this.client.on(Events.READY, () =>
			this.emitConnection({ status: ClientStatus.Ready }),
		);
		this.client.on(Events.DISCONNECTED, (state) =>
			this.emitConnection({
				status: ClientStatus.Disconnected,
				reason: toDisconnectReason(state),
			}),
		);
		this.client.on(Events.AUTHENTICATION_FAILURE, (message) =>
			this.emitConnection({
				status: ClientStatus.Disconnected,
				reason: { kind: DisconnectKind.AuthFailure, message },
			}),
		);

		// The portable message event; `message_create` also reaches handlers
		// under its own name through the generic forward below.
		this.client.on(Events.MESSAGE_CREATE, (message) =>
			this.emit("messageUpsert", new WWebJsMessage(message)),
		);

		// The portable delivery event. `message_ack` still reaches handlers under
		// its own name too, with the raw numeric ack.
		this.client.on(Events.MESSAGE_ACK, (message, ack) => {
			const status = toMessageStatus(ack);
			if (!status) return;
			this.emit("messageStatus", {
				messageId: message.id._serialized,
				chatId: toCanonicalJid(message.fromMe ? message.to : message.from),
				status,
				timestamp: message.timestamp ? message.timestamp * 1000 : undefined,
			} satisfies NestWhatsMessageStatusUpdate);
		});

		// Every other event is forwarded straight from the native `Events` enum,
		// so one added by whatsapp-web.js flows through without touching this file.
		for (const [nativeEvent, event] of NATIVE_TO_NESTWHATS) {
			if (
				nativeEvent === Events.QR_RECEIVED ||
				nativeEvent === Events.CODE_RECEIVED
			)
				continue;
			this.client.on(nativeEvent, (...args: unknown[]) =>
				this.emit(event, ...args.map(toNestWhats)),
			);
		}
	}

	private emitConnection(update: ConnectionUpdate): void {
		this.emit("connectionUpdate", update);
	}

	public async initialize(): Promise<void> {
		try {
			await this.client.initialize();
		} catch (err: unknown) {
			// whatsapp-web.js throws the bare string "auth timeout" with no clue
			// about what to do; say what actually happened.
			if (String(err) === "auth timeout") {
				const seconds = Math.round(this.authTimeoutMs / 1000);
				throw new Error(
					`WhatsApp Web did not finish loading within ${seconds}s. Starting several clients at once makes this more likely — raise it with the authTimeoutMs option, or start fewer clients in parallel.`,
				);
			}
			throw err;
		}
	}

	public async destroy(): Promise<void> {
		await this.client.destroy();
	}

	public async logout(): Promise<void> {
		await this.client.logout();
	}

	public getInfo(): NestWhatsAdapterInfo | undefined {
		if (!this.client.info) return undefined;
		return {
			id: toCanonicalJid(this.client.info.wid._serialized),
			displayName: this.client.info.pushname,
			phone: this.client.info.wid.user,
		};
	}

	public async sendMessage(
		chatId: string,
		content: string,
	): Promise<WWebJsMessage> {
		const message = await this.client.sendMessage(toNativeJid(chatId), content);
		return new WWebJsMessage(message);
	}

	public async sendMedia(
		chatId: string,
		media: NestWhatsMedia,
	): Promise<WWebJsMessage> {
		const [payload, options] = toSendArgs(media);
		const message = await this.client.sendMessage(
			toNativeJid(chatId),
			payload,
			options,
		);
		return new WWebJsMessage(message);
	}

	public async sendPresence(
		chatId: string,
		state: PresenceState,
	): Promise<void> {
		const chat = await this.client.getChatById(toNativeJid(chatId));
		if (state === PresenceState.Typing) await chat.sendStateTyping();
		else if (state === PresenceState.Recording) await chat.sendStateRecording();
		else await chat.clearState();
	}

	public async sendSeen(chatId: string): Promise<void> {
		await this.client.sendSeen(toNativeJid(chatId));
	}

	public async revokeMessage(messageId: string): Promise<void> {
		const message = await this.client.getMessageById(messageId);
		await message.delete(true);
	}

	public async getChats(): Promise<WWebJsChat[]> {
		const chats = await this.client.getChats();
		return chats.map((chat) => new WWebJsChat(chat));
	}

	public async getChat(chatId: string): Promise<WWebJsChat | undefined> {
		const chat = await this.client
			.getChatById(toNativeJid(chatId))
			.catch(() => undefined);
		return chat ? new WWebJsChat(chat) : undefined;
	}

	public async getContact(
		contactId: string,
	): Promise<WWebJsContact | undefined> {
		const contact = await this.client
			.getContactById(toNativeJid(contactId))
			.catch(() => undefined);
		return contact ? WWebJsContact.create(contact) : undefined;
	}

	public async createGroup(
		subject: string,
		participantIds: string[],
	): Promise<WWebJsChat> {
		const result = await this.client.createGroup(
			subject,
			participantIds.map(toNativeJid),
		);
		// whatsapp-web.js answers with a string only when it could not create the
		// group at all; otherwise it reports the new id plus who it failed to add.
		if (typeof result === "string") {
			throw new Error(`[NestWhats] Could not create group: ${result}`);
		}
		const chat = await this.client.getChatById(result.gid._serialized);
		return new WWebJsChat(chat);
	}

	public async getAbout(contactId: string): Promise<string | undefined> {
		const contact = await this.client
			.getContactById(toNativeJid(contactId))
			.catch(() => undefined);
		// Reads as null both when there is no text and when it is hidden; the
		// contract does not distinguish those either.
		return (await contact?.getAbout().catch(() => undefined)) ?? undefined;
	}

	public async setAbout(text: string): Promise<void> {
		await this.client.setStatus(text);
	}

	public async setProfileName(name: string): Promise<void> {
		await this.client.setDisplayName(name);
	}

	public async setProfilePicture(media: NestWhatsMedia): Promise<void> {
		await this.client.setProfilePicture(toNativeMedia(media));
	}

	public async setBlocked(contactId: string, blocked: boolean): Promise<void> {
		const contact = await this.client.getContactById(toNativeJid(contactId));
		await (blocked ? contact.block() : contact.unblock());
	}

	public get raw(): ClientType {
		return this.client;
	}
}
