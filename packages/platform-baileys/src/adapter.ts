import { EventEmitter } from "node:events";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { Logger } from "@nestjs/common";
import {
	areJidsSameUser,
	type BaileysEvent,
	type BaileysEventMap,
	Browsers,
	type ConnectionState,
	type Contact,
	fetchLatestBaileysVersion,
	type GroupMetadata,
	getAggregateVotesInPollMessage,
	getContentType,
	isJidGroup,
	isJidNewsletter,
	isLidUser,
	isPnUser,
	jidNormalizedUser,
	makeCacheableSignalKeyStore,
	makeWASocket,
	normalizeMessageContent,
	proto,
	type SocketConfig,
	useMultiFileAuthState,
	type WAMessage,
	type WAMessageKey,
	WAMessageStatus,
	type WASocket,
	type WAVersion,
} from "@whiskeysockets/baileys";
import {
	bareId,
	ClientStatus,
	type ConnectionUpdate,
	DisconnectKind,
	type NestWhatsAdapter,
	type NestWhatsAdapterInfo,
	type NestWhatsMedia,
	type NestWhatsMessageContent,
	type NestWhatsMessageStatusUpdate,
	type NestWhatsPresenceUpdate,
	type PostStatusOptions,
	type PresenceState,
} from "nestwhats";
import { toString as QRCodeString } from "qrcode";
import { ChatStore } from "./chat-store.js";
import {
	NATIVE_TO_NESTWHATS,
	receiptToStatus,
	SUPPORTED_EVENTS,
	toDisconnectReason,
	toMessageStatus,
	toNativePresence,
	toPresenceState,
} from "./events/index.js";
import { GroupMetadataCache } from "./group-metadata-cache.js";
import { type BaileysLogLevel, createNestBaileysLogger } from "./logger.js";
import { MessageCache } from "./message-cache.js";
import {
	type PasskeyAssertionSigner,
	type PasskeyChallenge,
	PasskeyHandshake,
	type PasskeyResult,
	type WebAuthnAssertion,
} from "./passkey/index.js";
import {
	BaileysChat,
	BaileysContact,
	type BaileysLogger,
	BaileysMessage,
	BaileysNewsletter,
	type BaileysPollVote,
	type BaileysPrivacySettings,
	type BaileysSocketHandle,
	sendAndWrap,
	toCanonicalJid,
	toNativeJid,
	toPrivacySettings,
	toSendContent,
} from "./structures/index.js";
import { TtlCache } from "./ttl-cache.js";

/**
 * Everything Baileys' own `SocketConfig` accepts — `syncFullHistory`,
 * `markOnlineOnConnect`, the timeouts, the caches — plus what this adapter
 * adds. `auth` and `browser` are the adapter's to build: the first from the
 * client's own session folder, the second from `deviceName` and `browserName`.
 */
export interface BaileysAdapterOptions
	extends Partial<Omit<SocketConfig, "auth" | "browser">> {
	/**
	 * Where credentials live. Each client keeps its own `session-<name>`
	 * folder inside it, so two clients never share a session. Defaults to
	 * `.baileys_auth`.
	 */
	authDir?: string;
	/**
	 * Link by pairing code instead of QR: the number to link, with country
	 * code and no punctuation. The code is emitted as `pairingCode` and typed
	 * on the phone under *Linked devices → Link with phone number*.
	 */
	phoneNumber?: string;
	/**
	 * Print whatever is needed to authenticate to the terminal: the QR code, or
	 * the pairing code when `phoneNumber` is set. Defaults to true.
	 */
	printAuthData?: boolean;
	/**
	 * What the phone shows under *Linked devices* as the device. Defaults to
	 * `Ubuntu`. Applied while pairing, so an already-linked client keeps its
	 * name until it links again.
	 */
	deviceName?: string;
	/** The browser shown next to the device name. Defaults to `Chrome`. */
	browserName?: string;
	/**
	 * Ask WhatsApp for the current Web version before connecting, falling back
	 * to the one bundled with Baileys when the lookup fails. Defaults to true;
	 * ignored when `version` is set.
	 */
	fetchLatestVersion?: boolean;
	/**
	 * How much of Baileys' own logging reaches Nest's logger. Defaults to
	 * `error`; ignored when a `logger` is given.
	 */
	logLevel?: BaileysLogLevel;
	/**
	 * Signs WhatsApp's passkey challenge, for accounts that can only link a
	 * device through their passkey. Set it on the factory and it serves every
	 * client, virtual ones included. Without it the challenge is emitted as a
	 * `passkeyChallenge` event instead, to be answered with `resolvePasskey`.
	 * See {@link PasskeyHandshake}.
	 */
	passkey?: PasskeyAssertionSigner;
	/**
	 * How long to wait for an answer to a `passkeyChallenge` event, in
	 * milliseconds. Defaults to 60s; WhatsApp gives up on its side not long
	 * after that.
	 */
	passkeyTimeoutMs?: number;
	/**
	 * Decline every incoming call as it arrives. Defaults to false. Calls this
	 * account places from another device are left alone; the `call` event
	 * still fires either way.
	 */
	rejectCalls?: boolean;
	/**
	 * Keep track of the conversations this client knows about, from the events
	 * Baileys emits. Defaults to true.
	 *
	 * Baileys is stateless by design and its documentation is explicit that
	 * maintaining this is the application's job — so the adapter does it. It
	 * is what makes `getChats` list direct conversations rather than only
	 * groups, and what fills a chat's name, unread count, archived, pinned,
	 * muted and last-activity fields. Metadata only, never messages.
	 */
	chatStore?: boolean;
	/**
	 * How many chats to keep, least recently active dropped first. Defaults to
	 * 1000 — a history sync can deliver far more than anyone lists.
	 */
	chatStoreMax?: number;
	/**
	 * Remember a group's participant list between sends. Defaults to true.
	 *
	 * Baileys asks for it every time it encrypts a message for a group, and
	 * its own FAQ names the resulting round trip per message as how accounts
	 * get rate-limited and banned for sending in groups. Anything that changes
	 * the group drops the entry, so a stale list is never used.
	 */
	groupCache?: boolean;
	/** How long a cached participant list stays good. Defaults to 5 minutes. */
	groupCacheTtlMs?: number;
	/**
	 * How many messages to remember — key, timestamp and content, never media.
	 * Defaults to 2000. This is what answers Baileys' `getMessage`, so a
	 * recipient who could not decrypt one gets it resent instead of sitting on
	 * "waiting for this message"; it also backs revokes, read markers and poll
	 * votes.
	 */
	messageCacheMax?: number;
}

const DEFAULT_AUTH_DIR = ".baileys_auth";
const DEFAULT_PASSKEY_TIMEOUT_MS = 60_000;

/** An answer to a passkey challenge that has not arrived yet. */
interface PendingPasskey {
	resolve(assertion: WebAuthnAssertion): void;
	reject(reason?: unknown): void;
}

/** `.baileys_auth` + `personal` -> `.baileys_auth/session-personal` */
export function sessionDirFor(
	authDir: string | undefined,
	clientName: string | undefined,
): string {
	return join(
		authDir ?? DEFAULT_AUTH_DIR,
		`session-${clientName ?? "default"}`,
	);
}

/**
 * Content kinds that arrive through `messages.upsert` without being a message
 * anyone would reply to: reactions, poll votes, and protocol traffic other
 * than a revoke. They still reach handlers through the native
 * `messagesUpsert` event, untouched.
 */
const NOT_A_MESSAGE = new Set<keyof proto.IMessage>([
	"reactionMessage",
	"pollUpdateMessage",
	"senderKeyDistributionMessage",
	"secretEncryptedMessage",
]);

/**
 * NestWhats adapter backed by Baileys, which speaks WhatsApp Web's protocol
 * over a WebSocket — no browser.
 *
 * One of these serves one client. Build them with
 * {@link BaileysAdapterFactory}, which is what gives each client its own
 * session folder — constructing this directly is for tests and for code that
 * already knows which session it wants.
 *
 * Being a socket it supports every optional method the contract has. The one
 * with a caveat is `getChats`: Baileys keeps no chat list of its own, so this
 * adapter maintains one, and turning `chatStore` off leaves the method with
 * groups alone. It is also the platform for the two things a browser session
 * cannot do — posting to status and subscribing to presence — and adds its
 * own: communities, newsletters, joining and previewing group invites,
 * declining calls, and the account's privacy settings.
 *
 * Baileys does not reconnect by itself: a closed socket is gone, and even a
 * successful pairing ends in a `restartRequired` close. `initialize()` builds
 * a fresh socket every time it is called, so turn on `reconnect` in `forRoot`
 * and the core brings the client back.
 *
 * The native `WASocket` stays reachable through `raw` once `initialize()` has
 * built it.
 */
export class BaileysAdapter
	extends EventEmitter
	implements NestWhatsAdapter<WASocket>, BaileysSocketHandle
{
	public readonly supportedEvents = SUPPORTED_EVENTS;
	/** Where this client's credentials live; one folder per client. */
	public readonly sessionDir: string;
	public readonly baileysLogger: BaileysLogger;
	private readonly logger = new Logger(BaileysAdapter.name);
	private readonly options: BaileysAdapterOptions;
	private readonly messages: MessageCache;
	private readonly chatStore: ChatStore | undefined;
	private readonly groupCache: GroupMetadataCache | undefined;
	/**
	 * Kept on the adapter rather than left to Baileys, which builds one per
	 * socket: this one is rebuilt on every reconnect, and a retry counter that
	 * resets with it lets a message that cannot be decrypted retry forever.
	 */
	private readonly retryCounters = new TtlCache(60 * 60_000, 1000);
	private readonly blocked = new Set<string>();
	private blocklistKnown = false;
	/** Presence is subscribed per connection, so these are re-sent on reconnect. */
	private readonly presenceSubscriptions = new Set<string>();
	private sock?: WASocket;
	private passkey?: PasskeyHandshake;
	private pendingPasskey?: PendingPasskey;
	private unbind: Array<() => void> = [];
	private pairingRequested = false;
	private version?: WAVersion;

	/**
	 * @param options - Baileys socket options, plus what this adapter adds.
	 * @param clientName - the client this serves; names the session folder and
	 * labels the QR or pairing code it prints, so several clients
	 * authenticating at once can be told apart in the terminal.
	 */
	public constructor(
		options: BaileysAdapterOptions = {},
		private readonly clientName?: string,
	) {
		super();
		this.options = options;
		this.sessionDir = sessionDirFor(options.authDir, clientName);
		this.baileysLogger =
			options.logger ??
			createNestBaileysLogger(
				options.logLevel ?? "error",
				clientName ? `Baileys:${clientName}` : "Baileys",
			);
		if (options.version) this.version = options.version;
		// Built here rather than in initialize(): the chats a client knows are
		// its own state, not the socket's, and must survive a reconnect.
		this.chatStore =
			options.chatStore === false
				? undefined
				: new ChatStore(options.chatStoreMax);
		this.messages = new MessageCache(options.messageCacheMax);
		this.groupCache =
			options.groupCache === false
				? undefined
				: new GroupMetadataCache(options.groupCacheTtlMs);
	}

	public get raw(): WASocket {
		return this.socket;
	}

	/** {@link BaileysSocketHandle} — the live socket for the structures. */
	public get socket(): WASocket {
		if (!this.sock) {
			throw new Error(
				`[NestWhats] Client "${this.clientName ?? "default"}" has no Baileys socket yet: call initialize() first`,
			);
		}
		return this.sock;
	}

	public get user(): Contact | undefined {
		return this.sock?.user;
	}

	/** {@link BaileysSocketHandle} — what this client knows about its chats. */
	public get chats(): ChatStore | undefined {
		return this.chatStore;
	}

	public remember(message: WAMessage): void {
		this.messages.remember(message);
	}

	public lastMessage(nativeJid: string): WAMessage | undefined {
		return this.messages.lastMessage(nativeJid);
	}

	public lastReceived(nativeJid: string): WAMessage | undefined {
		return this.messages.lastReceived(nativeJid);
	}

	/**
	 * `undefined` rather than false until the blocklist has arrived: not
	 * knowing and knowing there is no block are different answers.
	 */
	public isBlocked(nativeJid: string): boolean | undefined {
		if (!this.blocklistKnown) return undefined;
		return this.blocked.has(jidNormalizedUser(nativeJid));
	}

	/**
	 * The participant list Baileys needs to encrypt for a group, fetched once
	 * and kept. On a miss it fetches here rather than answering undefined, so
	 * the entry exists for the next message instead of every message paying
	 * the round trip.
	 */
	private async cachedGroupMetadata(
		jid: string,
	): Promise<GroupMetadata | undefined> {
		const cache = this.groupCache;
		if (!cache) return undefined;
		const cached = cache.get(jid);
		if (cached) return cached;
		try {
			const metadata = await this.socket.groupMetadata(jid);
			cache.set(metadata);
			return metadata;
		} catch {
			// Not a member, or the query failed; Baileys falls back to its own.
			return undefined;
		}
	}

	private get label(): string {
		return this.clientName ? `[${this.clientName}] ` : "";
	}

	public async initialize(): Promise<void> {
		// A second call is a reconnect: the previous socket is dead or dying, and
		// its listeners must go with it or every event would arrive twice.
		await this.teardown();

		const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);
		const version = await this.resolveVersion();
		const {
			authDir: _authDir,
			phoneNumber: _phoneNumber,
			printAuthData: _printAuthData,
			deviceName,
			browserName,
			fetchLatestVersion: _fetchLatestVersion,
			logLevel: _logLevel,
			logger: _logger,
			passkey,
			passkeyTimeoutMs: _passkeyTimeoutMs,
			chatStore: _chatStore,
			chatStoreMax: _chatStoreMax,
			groupCache: _groupCache,
			groupCacheTtlMs: _groupCacheTtlMs,
			messageCacheMax: _messageCacheMax,
			rejectCalls,
			...socketConfig
		} = this.options;

		const browser = Browsers.ubuntu(browserName ?? "Chrome");
		if (deviceName) browser[0] = deviceName;

		// Spreading `version: undefined` would override Baileys' bundled default
		// with nothing, and the login node fails on it; only a resolved version
		// is passed at all.
		const sock = makeWASocket({
			// Defaults first, so anything passed in wins over them.
			getMessage: async (key) =>
				key.id ? this.messages.content(key.id) : undefined,
			cachedGroupMetadata: (jid) => this.cachedGroupMetadata(jid),
			msgRetryCounterCache: this.retryCounters,
			...socketConfig,
			...(version ? { version } : {}),
			browser,
			logger: this.baileysLogger,
			auth: {
				creds: state.creds,
				keys: makeCacheableSignalKeyStore(state.keys, this.baileysLogger),
			},
		});
		this.sock = sock;
		this.pairingRequested = false;
		this.passkey = new PasskeyHandshake(
			sock,
			state.creds,
			saveCreds,
			(requestOptions) => this.signPasskey(requestOptions),
			this.logger,
			this.label,
			(result) =>
				this.emit("passkeyResult", {
					...this.passkeyContext(),
					...result,
				} satisfies PasskeyResult),
		);
		this.passkey.register();

		this.bind(sock, "creds.update", () => void saveCreds());
		this.bind(
			sock,
			"connection.update",
			(update) => void this.onConnectionUpdate(sock, update),
		);
		this.bind(sock, "messages.upsert", (upsert) =>
			this.onMessagesUpsert(upsert),
		);
		this.bind(sock, "messages.update", (updates) =>
			this.onMessagesUpdate(updates),
		);
		this.bind(sock, "message-receipt.update", (receipts) =>
			this.onReceiptUpdate(receipts),
		);
		this.bind(sock, "presence.update", (update) =>
			this.onPresenceUpdate(update),
		);
		if (rejectCalls) {
			this.bind(sock, "call", (calls) => void this.rejectIncoming(calls));
		}

		// A group whose membership or settings changed has a stale entry;
		// dropping it costs one refetch, using it encrypts for the wrong people.
		const groupCache = this.groupCache;
		if (groupCache) {
			this.bind(sock, "groups.update", (updates) => {
				for (const update of updates) groupCache.invalidate(update.id);
			});
			this.bind(sock, "group-participants.update", ({ id }) =>
				groupCache.invalidate(id),
			);
			this.bind(sock, "groups.upsert", (groups) => {
				for (const group of groups) groupCache.set(group);
			});
		}

		this.bind(sock, "blocklist.set", ({ blocklist }) => {
			this.blocked.clear();
			for (const jid of blocklist) this.blocked.add(jidNormalizedUser(jid));
			this.blocklistKnown = true;
		});
		this.bind(sock, "blocklist.update", ({ blocklist, type }) => {
			for (const jid of blocklist) {
				const normalized = jidNormalizedUser(jid);
				if (type === "add") this.blocked.add(normalized);
				else this.blocked.delete(normalized);
			}
			this.blocklistKnown = true;
		});

		// The chat list, kept from the events that report it. History sync
		// carries the bulk of it; the rest trickles in as things change.
		const chats = this.chatStore;
		if (chats) {
			this.bind(sock, "chats.upsert", (upserted) => chats.upsert(upserted));
			this.bind(sock, "chats.update", (updates) => chats.update(updates));
			this.bind(sock, "chats.delete", (ids) => chats.remove(ids));
			this.bind(sock, "messaging-history.set", ({ chats: synced }) =>
				chats.upsert(synced),
			);
		}

		// Every other event is forwarded as it is, under its NestWhats spelling.
		for (const [nativeEvent, event] of NATIVE_TO_NESTWHATS) {
			this.bind(sock, nativeEvent, (payload) => this.emit(event, payload));
		}

		this.emitConnection({ status: ClientStatus.Initializing });
	}

	private bind<E extends BaileysEvent>(
		sock: WASocket,
		event: E,
		listener: (payload: BaileysEventMap[E]) => void,
	): void {
		sock.ev.on(event, listener);
		this.unbind.push(() => sock.ev.off(event, listener));
	}

	/** Detaches from the current socket and closes it; safe with no socket at all. */
	private async teardown(): Promise<void> {
		const sock = this.sock;
		this.passkey?.dispose();
		this.passkey = undefined;
		this.pendingPasskey?.reject(
			new Error("Socket closed before the passkey was answered"),
		);
		for (const off of this.unbind) off();
		this.unbind = [];
		this.sock = undefined;
		if (!sock) return;
		try {
			// `end` on a socket that already closed returns at once.
			await sock.end(undefined);
		} catch (err: unknown) {
			this.logger.debug(
				`${this.label}Closing the previous socket failed: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}

	private async resolveVersion(): Promise<WAVersion | undefined> {
		if (this.version) return this.version;
		if (this.options.fetchLatestVersion === false) return undefined;
		try {
			const { version } = await fetchLatestBaileysVersion();
			this.version = version;
			return version;
		} catch (err: unknown) {
			this.logger.warn(
				`${this.label}Could not fetch the latest WhatsApp Web version, using the one bundled with Baileys: ${err instanceof Error ? err.message : String(err)}`,
			);
			return undefined;
		}
	}

	private async onConnectionUpdate(
		sock: WASocket,
		update: Partial<ConnectionState>,
	): Promise<void> {
		const { connection, lastDisconnect, qr, isNewLogin } = update;

		if (qr) {
			// With a phone number configured, the first QR is the moment the
			// socket is ready to hand out a pairing code instead. It is requested
			// once per socket: Baileys refreshes the QR every few seconds, and
			// each refresh would otherwise mint a new code.
			if (this.options.phoneNumber && !sock.authState.creds.registered) {
				if (!this.pairingRequested) {
					this.pairingRequested = true;
					await this.requestPairingCode(sock, this.options.phoneNumber);
				}
			} else {
				this.printQr(qr);
				this.emitConnection({ status: ClientStatus.QrReceived, qr });
			}
		}

		// Baileys announces a successful pairing this way, then closes the
		// socket with `restartRequired`; the reconnect is what reaches `open`.
		if (isNewLogin) this.emitConnection({ status: ClientStatus.Authenticated });

		if (connection === "connecting") {
			this.emitConnection({ status: ClientStatus.Initializing });
		} else if (connection === "open") {
			// Repeats on every reconnect; the core suppresses the duplicate.
			this.emitConnection({ status: ClientStatus.Ready });
			void this.resubscribePresence();
		} else if (connection === "close") {
			const reason = toDisconnectReason(lastDisconnect?.error);
			if (reason.kind === DisconnectKind.LoggedOut) {
				// The credentials are revoked: reconnecting with them would only
				// close again with the same code. Clearing them is what makes the
				// next initialize() ask for a QR.
				await this.clearSession();
			}
			this.emitConnection({ status: ClientStatus.Disconnected, reason });
		}
	}

	private async requestPairingCode(
		sock: WASocket,
		phoneNumber: string,
	): Promise<void> {
		try {
			const code = await sock.requestPairingCode(
				phoneNumber.replace(/\D/g, ""),
			);
			if (this.options.printAuthData !== false) {
				this.logger.verbose(`${this.label}Pairing code: ${code}`);
			}
			this.emitConnection({
				status: ClientStatus.PairingCodeReceived,
				pairingCode: code,
			});
		} catch (err: unknown) {
			this.logger.error(
				`${this.label}Could not request a pairing code: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}

	private printQr(qr: string): void {
		if (this.options.printAuthData === false) return;
		QRCodeString(qr, { type: "terminal", small: true }, (err, rendered) => {
			if (err) {
				this.logger.error(
					`${this.label}Error generating QR code: ${err.message}`,
				);
				return;
			}
			this.logger.verbose(
				`${this.label}Scan the QR code below to authenticate:`,
			);
			console.log(rendered);
		});
	}

	private onMessagesUpsert({
		messages,
		type,
	}: BaileysEventMap["messages.upsert"]): void {
		for (const message of messages) this.messages.remember(message);

		// Only `notify` is a live message. `append` is what history sync and
		// the echo of this socket's own sends arrive as — replaying a synced
		// history through `messageUpsert` would run every command in it again.
		if (type !== "notify") return;

		for (const message of messages) {
			const content = normalizeMessageContent(message.message);
			const kind = getContentType(content);
			// A message with no content is a stub — someone joined, the subject
			// changed — which Baileys reports through its own group events.
			if (!kind || NOT_A_MESSAGE.has(kind)) continue;
			if (
				kind === "protocolMessage" &&
				content?.protocolMessage?.type !==
					proto.Message.ProtocolMessage.Type.REVOKE
			) {
				continue;
			}
			this.emit("messageUpsert", new BaileysMessage(message, this));
		}
	}

	private onMessagesUpdate(updates: BaileysEventMap["messages.update"]): void {
		for (const { key, update } of updates) {
			if (update.pollUpdates?.length) {
				this.emitPollVote(key, update.pollUpdates);
			}
			if (!key.fromMe || !key.id || !key.remoteJid) continue;
			const status = toMessageStatus(update.status);
			if (!status) continue;
			// In a group this carries an aggregate that advances as soon as the
			// first recipient answers; the per-recipient truth arrives through
			// `message-receipt.update`. Only the message-level stages — accepted,
			// reached the server, failed — are trustworthy here.
			if (
				isJidGroup(key.remoteJid) &&
				(update.status ?? 0) > WAMessageStatus.SERVER_ACK
			) {
				continue;
			}
			this.emit("messageStatus", {
				messageId: key.id,
				chatId: toCanonicalJid(key.remoteJid),
				status,
			} satisfies NestWhatsMessageStatusUpdate);
		}
	}

	/**
	 * A vote arrives encrypted against the poll it answers, so it can only be
	 * read while that poll is still in the message cache — which is also what
	 * lets Baileys decrypt it in the first place, through `getMessage`.
	 */
	private emitPollVote(
		key: WAMessageKey,
		pollUpdates: proto.IPollUpdate[],
	): void {
		if (!key.id || !key.remoteJid) return;
		const poll = this.messages.get(key.id);
		if (!poll?.message) {
			this.logger.debug(
				`${this.label}Poll vote for ${key.id} arrived after the poll left the cache; raising messageCacheMax keeps it readable`,
			);
			return;
		}
		const me = this.user;
		const results = getAggregateVotesInPollMessage(
			{ message: poll.message, pollUpdates },
			me ? jidNormalizedUser(me.id) : undefined,
		).map(({ name, voters }) => ({
			option: name,
			voters: voters.map(toCanonicalJid),
		}));
		this.emit("pollVote", {
			messageId: key.id,
			chatId: toCanonicalJid(key.remoteJid),
			results,
		} satisfies BaileysPollVote);
	}

	private onReceiptUpdate(
		receipts: BaileysEventMap["message-receipt.update"],
	): void {
		for (const { key, receipt } of receipts) {
			if (!key.fromMe || !key.id || !key.remoteJid) continue;
			const derived = receiptToStatus(receipt);
			if (!derived) continue;
			const inGroup = isJidGroup(key.remoteJid);
			const participant = inGroup
				? (receipt.userJid ?? key.participant ?? undefined)
				: undefined;
			// This account's own receipt of its own group message is not a
			// recipient's: it would read as "read" before anyone opened it.
			if (participant && this.isMe(participant)) continue;
			this.emit("messageStatus", {
				messageId: key.id,
				chatId: toCanonicalJid(key.remoteJid),
				status: derived.status,
				participantId: participant ? toCanonicalJid(participant) : undefined,
				timestamp: derived.timestamp,
			} satisfies NestWhatsMessageStatusUpdate);
		}
	}

	private onPresenceUpdate({
		id,
		presences,
	}: BaileysEventMap["presence.update"]): void {
		const chatId = toCanonicalJid(id);
		for (const [participant, data] of Object.entries(presences ?? {})) {
			const state = toPresenceState(data?.lastKnownPresence);
			if (!state) continue;
			this.emit("presenceUpdate", {
				contactId: toCanonicalJid(participant),
				state,
				// Seconds from Baileys, milliseconds in the contract. Absent means
				// privacy hides it, not that the contact was never seen.
				lastSeenAt: data.lastSeen ? data.lastSeen * 1000 : undefined,
				chatId,
			} satisfies NestWhatsPresenceUpdate);
		}
	}

	private passkeyContext(): { clientName?: string; phoneNumber?: string } {
		return {
			clientName: this.clientName,
			phoneNumber: this.options.phoneNumber,
		};
	}

	/**
	 * A configured signer answers directly. Without one the challenge goes out
	 * as an event and the answer comes back through `resolvePasskey` — from
	 * the handler, an HTTP endpoint, a dashboard — within `passkeyTimeoutMs`.
	 */
	private signPasskey(requestOptions: unknown): Promise<WebAuthnAssertion> {
		const context = this.passkeyContext();
		if (this.options.passkey) {
			return this.options.passkey(requestOptions, context);
		}

		this.pendingPasskey?.reject(
			new Error("Superseded by a newer passkey challenge"),
		);
		return new Promise<WebAuthnAssertion>((resolve, reject) => {
			const timeoutMs =
				this.options.passkeyTimeoutMs ?? DEFAULT_PASSKEY_TIMEOUT_MS;
			const settle = () => {
				clearTimeout(timer);
				this.pendingPasskey = undefined;
			};
			const timer = setTimeout(() => {
				settle();
				reject(
					new Error(
						`No answer to the passkey challenge within ${Math.round(timeoutMs / 1000)}s — configure a passkey signer or call resolvePasskey()`,
					),
				);
			}, timeoutMs);
			timer.unref?.();
			this.pendingPasskey = {
				resolve: (assertion) => {
					settle();
					resolve(assertion);
				},
				reject: (reason) => {
					settle();
					reject(reason ?? new Error("Passkey challenge rejected"));
				},
			};
			const challenge: PasskeyChallenge = {
				...context,
				requestOptions,
				resolve: this.pendingPasskey.resolve,
				reject: this.pendingPasskey.reject,
			};
			if (this.listenerCount("passkeyChallenge") === 0) {
				this.logger.warn(
					`${this.label}WhatsApp asked for a passkey and nothing is listening to passkeyChallenge; the pairing will time out unless resolvePasskey() is called`,
				);
			}
			this.emit("passkeyChallenge", challenge);
		});
	}

	/**
	 * Answers the passkey challenge this client is waiting on. Throws when
	 * there is none — the challenge timed out, was answered, or never came.
	 */
	public resolvePasskey(assertion: WebAuthnAssertion): void {
		const pending = this.pendingPasskey;
		if (!pending) {
			throw new Error(
				`[NestWhats] Client "${this.clientName ?? "default"}" has no passkey challenge waiting`,
			);
		}
		pending.resolve(assertion);
	}

	/** Gives up on the passkey challenge this client is waiting on, if any. */
	public rejectPasskey(reason?: unknown): void {
		this.pendingPasskey?.reject(reason);
	}

	/**
	 * Only the offer is a call to decline; the status updates that follow are
	 * about the same call. An offer from this account's own id is a call it is
	 * placing from another device, not one to hang up on.
	 */
	private async rejectIncoming(calls: BaileysEventMap["call"]): Promise<void> {
		for (const call of calls) {
			if (call.status !== "offer" || !call.from || this.isMe(call.from)) {
				continue;
			}
			try {
				await this.socket.rejectCall(call.id, call.from);
				this.logger.verbose(
					`${this.label}Declined call ${call.id} from ${toCanonicalJid(call.from)}`,
				);
			} catch (err: unknown) {
				this.logger.warn(
					`${this.label}Could not decline call ${call.id}: ${err instanceof Error ? err.message : String(err)}`,
				);
			}
		}
	}

	private isMe(jid: string): boolean {
		const me = this.sock?.user;
		if (!me) return false;
		return (
			areJidsSameUser(me.id, jid) || (!!me.lid && areJidsSameUser(me.lid, jid))
		);
	}

	private emitConnection(update: ConnectionUpdate): void {
		this.emit("connectionUpdate", update);
	}

	private async clearSession(): Promise<void> {
		await rm(this.sessionDir, { recursive: true, force: true });
		this.logger.log(`${this.label}Session credentials cleared`);
	}

	public async destroy(): Promise<void> {
		await this.teardown();
	}

	public async logout(): Promise<void> {
		const sock = this.sock;
		if (sock) {
			try {
				await sock.logout();
			} catch (err: unknown) {
				this.logger.warn(
					`${this.label}Logout request failed, dropping the credentials anyway: ${err instanceof Error ? err.message : String(err)}`,
				);
			}
		}
		await this.teardown();
		await this.clearSession();
		// The chat list belonged to the account that just went away.
		this.chatStore?.clear();
		this.messages.clear();
		this.groupCache?.clear();
		this.retryCounters.flushAll();
		this.blocked.clear();
		this.blocklistKnown = false;
		this.presenceSubscriptions.clear();
	}

	public getInfo(): NestWhatsAdapterInfo | undefined {
		const me = this.sock?.user;
		// `user` is filled from the credentials as soon as a pairing code is
		// requested, with a placeholder name; only a registered session is an
		// answer.
		if (!me || !this.sock?.authState.creds.registered) return undefined;
		const id = jidNormalizedUser(me.id);
		return {
			id: toCanonicalJid(id),
			displayName: me.name,
			phone: isPnUser(id) ? bareId(id) : undefined,
		};
	}

	public async sendMessage(
		chatId: string,
		content: string,
	): Promise<BaileysMessage> {
		return sendAndWrap(this, toNativeJid(chatId), { text: content });
	}

	public async sendMedia(
		chatId: string,
		media: NestWhatsMedia,
	): Promise<BaileysMessage> {
		return sendAndWrap(this, toNativeJid(chatId), toSendContent(media));
	}

	public async sendPresence(
		chatId: string,
		state: PresenceState,
	): Promise<void> {
		await this.socket.sendPresenceUpdate(
			toNativePresence(state),
			toNativeJid(chatId),
		);
	}

	public async sendSeen(chatId: string): Promise<void> {
		// Baileys marks messages read by key, not chats; the last one received
		// from that chat is what "seen up to here" means. Nothing received since
		// this socket came up means nothing to mark.
		const marker = this.messages.lastReceived(toNativeJid(chatId));
		if (!marker) {
			this.logger.verbose(
				`${this.label}sendSeen(${chatId}): no message received from this chat yet, nothing to mark`,
			);
			return;
		}
		await this.socket.readMessages([marker.key]);
	}

	public async revokeMessage(messageId: string): Promise<void> {
		const key = this.messages.key(messageId);
		if (!key?.remoteJid) {
			throw new Error(
				`[NestWhats] Message ${messageId} is not known to this client — Baileys keeps no store, so only messages seen since it connected can be revoked by id. Use message.delete(true) on the message itself instead.`,
			);
		}
		await this.socket.sendMessage(key.remoteJid, { delete: key });
	}

	/**
	 * Whether the socket can address this id, as far as it can tell without a
	 * store: a phone number is checked with WhatsApp, a LID through the
	 * mapping the socket has learned. Nothing is invented for the rest.
	 */
	private async resolveContact(
		contactId: string,
	): Promise<Contact | undefined> {
		const jid = toNativeJid(contactId);
		if (isPnUser(jid)) {
			const [result] = (await this.socket.onWhatsApp(bareId(jid))) ?? [];
			if (!result?.exists) return undefined;
			return { id: jidNormalizedUser(result.jid), phoneNumber: result.jid };
		}
		if (isLidUser(jid)) {
			const pn = await this.socket.signalRepository.lidMapping.getPNForLID(jid);
			if (!pn) return undefined;
			return {
				id: jidNormalizedUser(jid),
				lid: jidNormalizedUser(jid),
				phoneNumber: jidNormalizedUser(pn),
			};
		}
		return undefined;
	}

	/**
	 * Every conversation this client knows about: the chats the store has seen,
	 * plus every group this account is in.
	 *
	 * Baileys keeps no chat list of its own, so the store is what makes direct
	 * conversations listable at all — with `chatStore: false` this falls back
	 * to groups only. Groups are asked for on top of the store because
	 * WhatsApp answers for them on request, so they are known before any
	 * history sync arrives, and their metadata carries the subject and the
	 * participants.
	 */
	public async getChats(): Promise<BaileysChat[]> {
		const byJid = new Map<string, BaileysChat>();
		for (const chat of this.chatStore?.all() ?? []) {
			if (chat.id)
				byJid.set(chat.id, new BaileysChat(chat.id, undefined, this));
		}
		// Asked for on top of the store: WhatsApp answers for groups on
		// request, so they are known before any history sync arrives — and
		// their metadata is what carries the subject and the participants.
		try {
			const groups = await this.socket.groupFetchAllParticipating();
			for (const [jid, metadata] of Object.entries(groups)) {
				byJid.set(jid, new BaileysChat(jid, metadata, this));
			}
		} catch (err: unknown) {
			// A failed lookup must not lose the chats already known.
			if (byJid.size === 0) throw err;
			this.logger.warn(
				`${this.label}Could not list the participating groups, answering with the chats already known: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
		return [...byJid.values()];
	}

	public async getChat(chatId: string): Promise<BaileysChat | undefined> {
		const jid = toNativeJid(chatId);
		if (isJidGroup(jid)) {
			// Fails when this account is not a member, which is "no such chat"
			// from where it stands.
			return BaileysChat.fetch(this, jid).catch(() => undefined);
		}
		// A chat the store has seen needs no round trip, and carries its state.
		if (this.chatStore?.get(jid)) return new BaileysChat(jid, undefined, this);
		const contact = await this.resolveContact(chatId);
		return contact ? new BaileysChat(jid, undefined, this) : undefined;
	}

	public async getContact(
		contactId: string,
	): Promise<BaileysContact | undefined> {
		const contact = await this.resolveContact(contactId);
		return contact ? new BaileysContact(contact, this) : undefined;
	}

	public async createGroup(
		subject: string,
		participantIds: string[],
	): Promise<BaileysChat> {
		const metadata = await this.socket.groupCreate(
			subject,
			participantIds.map(toNativeJid),
		);
		return new BaileysChat(metadata.id, metadata, this);
	}

	public async getAbout(contactId: string): Promise<string | undefined> {
		const [entry] =
			(await this.socket.fetchStatus(toNativeJid(contactId))) ?? [];
		// The status protocol answers `{ status, setAt }` under its own name;
		// null both when there is no text and when privacy hides it.
		const about = (entry?.status as { status?: string | null } | undefined)
			?.status;
		return about ? about : undefined;
	}

	public async setAbout(text: string): Promise<void> {
		await this.socket.updateProfileStatus(text);
	}

	public async setProfileName(name: string): Promise<void> {
		await this.socket.updateProfileName(name);
	}

	public async setProfilePicture(media: NestWhatsMedia): Promise<void> {
		const me = this.user;
		if (!me) {
			throw new Error(
				`${this.label}[NestWhats] Cannot set the profile picture before the client is connected`,
			);
		}
		await this.socket.updateProfilePicture(
			jidNormalizedUser(me.id),
			media.data,
		);
	}

	public async setBlocked(contactId: string, blocked: boolean): Promise<void> {
		await this.socket.updateBlockStatus(
			toNativeJid(contactId),
			blocked ? "block" : "unblock",
		);
	}

	public async postStatus(
		content: NestWhatsMessageContent,
		options?: PostStatusOptions,
	): Promise<BaileysMessage> {
		// WhatsApp needs to be told who a status is encrypted for; without a
		// list it reaches nobody, which looks like a silent success.
		if (!options?.audience?.length) {
			throw new Error(
				"[NestWhats] postStatus needs an audience on Baileys: WhatsApp encrypts a status for the ids it is given, and posting without them reaches nobody. Pass options.audience with the contacts who should see it.",
			);
		}
		return sendAndWrap(this, "status@broadcast", toSendContent(content), {
			statusJidList: options.audience.map(toNativeJid),
			broadcast: true,
		});
	}

	public async subscribePresence(contactId: string): Promise<void> {
		const jid = toNativeJid(contactId);
		// A subscription lasts as long as the connection, so it is remembered
		// and re-sent on reconnect — otherwise presence quietly stops arriving
		// after the first drop.
		this.presenceSubscriptions.add(jid);
		await this.socket.presenceSubscribe(jid);
	}

	private async resubscribePresence(): Promise<void> {
		for (const jid of this.presenceSubscriptions) {
			await this.socket
				.presenceSubscribe(jid)
				.catch((err: unknown) =>
					this.logger.debug(
						`${this.label}Could not resubscribe to ${toCanonicalJid(jid)}: ${err instanceof Error ? err.message : String(err)}`,
					),
				);
		}
	}

	/**
	 * `createCommunity` — a Baileys-only capability, registered by this
	 * package. A community is a group that holds groups, so it comes back as a
	 * chat with the group operations on it.
	 */
	public async createCommunity(
		subject: string,
		description: string,
	): Promise<BaileysChat> {
		const metadata = await this.socket.communityCreate(subject, description);
		if (!metadata) {
			throw new Error(`[NestWhats] Could not create community "${subject}"`);
		}
		return new BaileysChat(metadata.id, metadata, this);
	}

	/**
	 * `rejectCall` — a Baileys-only capability, registered by this package.
	 *
	 * @param callId - the id from the `call` event.
	 * @param callerId - canonical id of who is calling.
	 */
	public async rejectCall(callId: string, callerId: string): Promise<void> {
		await this.socket.rejectCall(callId, toNativeJid(callerId));
	}

	/**
	 * `readPrivacy` — a Baileys-only capability, registered by this package.
	 * Fetched fresh each time, since another device may have changed it.
	 */
	public async getPrivacySettings(): Promise<Partial<BaileysPrivacySettings>> {
		return toPrivacySettings(await this.socket.fetchPrivacySettings(true));
	}

	/**
	 * `setPrivacy` — a Baileys-only capability, registered by this package.
	 * Each setting given is applied in turn; the rest are left as they are.
	 */
	public async setPrivacySettings(
		settings: Partial<BaileysPrivacySettings>,
	): Promise<void> {
		const sock = this.socket;
		if (settings.lastSeen) await sock.updateLastSeenPrivacy(settings.lastSeen);
		if (settings.online) await sock.updateOnlinePrivacy(settings.online);
		if (settings.profilePicture) {
			await sock.updateProfilePicturePrivacy(settings.profilePicture);
		}
		if (settings.about) await this.updateAboutPrivacy(settings.about);
		if (settings.status) await sock.updateStatusPrivacy(settings.status);
		if (settings.readReceipts) {
			await sock.updateReadReceiptsPrivacy(settings.readReceipts);
		}
		if (settings.groupAdd) await sock.updateGroupsAddPrivacy(settings.groupAdd);
		if (settings.calls) await sock.updateCallPrivacy(settings.calls);
		if (settings.messages) await sock.updateMessagesPrivacy(settings.messages);
	}

	/**
	 * Baileys has no setter for the "about" category, though it reports it;
	 * the IQ is the same one its other setters send.
	 */
	private async updateAboutPrivacy(value: string): Promise<void> {
		await this.socket.query({
			tag: "iq",
			attrs: { xmlns: "privacy", to: "@s.whatsapp.net", type: "set" },
			content: [
				{
					tag: "privacy",
					attrs: {},
					content: [{ tag: "category", attrs: { name: "about", value } }],
				},
			],
		});
	}

	/**
	 * `joinGroup` — a Baileys-only capability, registered by this package.
	 *
	 * @param inviteCode - the part after `chat.whatsapp.com/`, not the URL.
	 * @returns the canonical id of the group joined.
	 */
	public async joinGroup(inviteCode: string): Promise<string> {
		const jid = await this.socket.groupAcceptInvite(inviteCode);
		if (!jid) {
			throw new Error(
				`[NestWhats] WhatsApp did not accept the invite code "${inviteCode}"`,
			);
		}
		return toCanonicalJid(jid);
	}

	/**
	 * `previewInvite` — a Baileys-only capability, registered by this package.
	 * What a group looks like from outside, before joining it.
	 */
	public async getInviteInfo(
		inviteCode: string,
	): Promise<BaileysChat | undefined> {
		const metadata = await this.socket
			.groupGetInviteInfo(inviteCode)
			.catch(() => undefined);
		return metadata ? new BaileysChat(metadata.id, metadata, this) : undefined;
	}

	/**
	 * `setDisappearing` — a Baileys-only capability, registered by this
	 * package. The account's default for *new* chats; existing ones keep
	 * whatever they were set to.
	 *
	 * @param durationSeconds - one of {@link DisappearingDuration}; 0 turns it off.
	 */
	public async setDefaultDisappearing(durationSeconds: number): Promise<void> {
		await this.socket.updateDefaultDisappearingMode(durationSeconds);
	}

	/**
	 * `readCommunity` — a Baileys-only capability, registered by this package.
	 * `undefined` when this account is not in it, which is all the socket can
	 * tell.
	 */
	public async getCommunity(
		communityId: string,
	): Promise<BaileysChat | undefined> {
		const jid = toNativeJid(communityId);
		const metadata = await this.socket
			.communityMetadata(jid)
			.catch(() => undefined);
		return metadata?.isCommunity
			? new BaileysChat(jid, metadata, this)
			: undefined;
	}

	/** `createNewsletter` — a Baileys-only capability, registered by this package. */
	public async createNewsletter(
		name: string,
		description?: string,
	): Promise<BaileysNewsletter> {
		return new BaileysNewsletter(
			await this.socket.newsletterCreate(name, description),
			this,
		);
	}

	/**
	 * `readNewsletter` — a Baileys-only capability, registered by this package.
	 *
	 * @param idOrInviteCode - a canonical `…@newsletter` id, or the invite code
	 * after `whatsapp.com/channel/` for a channel this account does not follow
	 * yet. `undefined` when WhatsApp knows no such channel.
	 */
	public async getNewsletter(
		idOrInviteCode: string,
	): Promise<BaileysNewsletter | undefined> {
		const jid = toNativeJid(idOrInviteCode);
		const metadata = await this.socket
			.newsletterMetadata(
				isJidNewsletter(jid) ? "jid" : "invite",
				isJidNewsletter(jid) ? jid : idOrInviteCode,
			)
			.catch(() => null);
		return metadata ? new BaileysNewsletter(metadata, this) : undefined;
	}
}
