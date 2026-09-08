import type {
	ConnectionUpdate,
	DisconnectReason,
	NestWhatsMessageStatusUpdate,
	NestWhatsPresenceUpdate,
} from "../adapter/index.js";
import type { NestWhatsMessage } from "../structures/index.js";

/**
 * Events available on every adapter: the two an adapter must emit, plus the
 * ones the core derives from `connectionUpdate`.
 *
 * The vocabulary is NestWhats', not any library's — platform packages add their
 * own through module augmentation.
 */
export interface NestWhatsBaseEvents {
	/** Raw state from the adapter. Prefer the derived events below. */
	connectionUpdate: [update: ConnectionUpdate];
	/** Any message the platform surfaces, sent or received; filter with `fromMe`. */
	messageUpsert: [message: NestWhatsMessage];
	/**
	 * How far a message this client sent has got — delivered, read, or failed.
	 *
	 * Emitted by the adapter, not derived, so an adapter that cannot report it
	 * leaves it out of `supportedEvents` and subscribing is refused rather than
	 * silently never firing. On the official Cloud API this is the only way to
	 * learn that a send failed.
	 */
	messageStatus: [update: NestWhatsMessageStatusUpdate];
	/** A new QR payload to render. Fires again each time it refreshes. */
	qr: [qr: string];
	/** The code to type on the phone, when pairing by phone number. */
	pairingCode: [code: string];
	/** Credentials accepted; the client is not usable yet. */
	authenticated: [];
	/** The client is connected and can send. Fires once per connection. */
	ready: [];
	/**
	 * The client went down. `reason` says whether reconnecting can help —
	 * `isTerminalDisconnect` answers that directly.
	 */
	disconnected: [reason: DisconnectReason | undefined];
	/**
	 * Someone's presence changed — online, offline, typing — carrying "last
	 * seen at" when the platform and their privacy settings both allow it.
	 *
	 * Only fires for contacts this client subscribed to with
	 * `subscribePresence`, and only on a platform that has
	 * `AdapterCapability.SubscribePresence` at all.
	 */
	presenceUpdate: [update: NestWhatsPresenceUpdate];
}

/**
 * Every event available to `@On` and `@Once`, including whatever the imported
 * platform packages add through module augmentation.
 */
export type NestWhatsEvents = NestWhatsBaseEvents;

/** The handler signature one event takes, with its arguments typed. */
export type NestWhatsEventHandler<K extends keyof NestWhatsEvents> =
	NestWhatsEvents[K] extends unknown[]
		? (...args: Extract<NestWhatsEvents[K], unknown[]>) => void
		: () => void;
