import type { NestWhatsAdapter } from "./adapter.interface.js";
import { CapabilityNotSupportedError } from "./capability-error.js";

/**
 * The capability vocabulary: each name mapped to the adapter method it promises.
 *
 * A platform package adds its own through module augmentation, the same way it
 * adds events to `NestWhatsBaseEvents` — the core does not have to know the
 * feature exists, and a closed enum could never express it:
 *
 * ```typescript
 * declare module "nestwhats" {
 *   interface AdapterCapabilities {
 *     template: "sendTemplate";
 *   }
 * }
 *
 * registerCapability("template", "sendTemplate");
 * ```
 *
 * The augmentation is the type side; `registerCapability` is the runtime side,
 * and both are needed. Call it at module load in your platform package, so
 * importing the package is all a consumer has to do.
 */
export interface AdapterCapabilities {
	/** `sendMedia` — attachments, not only text. */
	sendMedia: "sendMedia";
	/** `sendPresence` — typing and recording indicators. */
	presence: "sendPresence";
	/** `sendSeen` — marking a chat as read. */
	readReceipts: "sendSeen";
	/** `revokeMessage` — deleting for everyone. */
	revoke: "revokeMessage";
	/** `getChats` — listing the conversations the client knows about. */
	listChats: "getChats";
	/** `getChat` — fetching one conversation by id. */
	readChat: "getChat";
	/** `getContact` — fetching one contact by id. */
	readContact: "getContact";
	/** `logout` — dropping the credentials, not just the connection. */
	logout: "logout";
	/** `createGroup` — starting a new group. */
	createGroup: "createGroup";
	/** `getAbout` — reading someone's profile text ("recado"). */
	readAbout: "getAbout";
	/** `setAbout` — changing this account's own profile text. */
	setAbout: "setAbout";
	/** `setProfileName` — changing this account's display name. */
	setProfileName: "setProfileName";
	/** `setProfilePicture` — changing this account's photo. */
	setProfilePicture: "setProfilePicture";
	/** `setBlocked` — blocking and unblocking a contact. */
	block: "setBlocked";
	/** `postStatus` — publishing to status/stories, not to a chat. */
	postStatus: "postStatus";
	/**
	 * `subscribePresence` — asking to be told when a contact comes and goes.
	 *
	 * Presence is push everywhere it exists: subscribing is the request, and
	 * the answers arrive as `presenceUpdate` events. "Last seen" rides along
	 * there, when privacy allows it at all.
	 */
	subscribePresence: "subscribePresence";
}

/**
 * What an adapter can do beyond the mandatory contract.
 *
 * The answer is normally *derived* from whether the method exists — an adapter
 * declares nothing and cannot drift out of sync with itself. This is the stable
 * vocabulary for asking, so a UI or a handler can name a feature without
 * knowing the method behind it, and it grows with whatever platform packages
 * are installed.
 *
 * Capabilities of the structures an adapter produces are deliberately absent:
 * whether a message can be edited or a group can list participants is answered
 * by the member itself (`if (message.edit)`), where the information already
 * lives.
 */
export type AdapterCapability = keyof AdapterCapabilities;

/**
 * The core capabilities by name, for code that prefers a symbol to a string
 * literal. Both spellings are the same value, so
 * `AdapterCapability.SendMedia === "sendMedia"`.
 *
 * A platform package's own capabilities are not here — nothing in the core can
 * know them. Name those as the string the augmentation declares, which is
 * checked all the same.
 */
export const AdapterCapability = {
	SendMedia: "sendMedia",
	Presence: "presence",
	ReadReceipts: "readReceipts",
	Revoke: "revoke",
	ListChats: "listChats",
	ReadChat: "readChat",
	ReadContact: "readContact",
	Logout: "logout",
	CreateGroup: "createGroup",
	ReadAbout: "readAbout",
	SetAbout: "setAbout",
	SetProfileName: "setProfileName",
	SetProfilePicture: "setProfilePicture",
	Block: "block",
	PostStatus: "postStatus",
	SubscribePresence: "subscribePresence",
} as const satisfies Record<string, AdapterCapability>;

/**
 * Capability -> adapter method, filled by the core and extended at runtime.
 *
 * A Map rather than a frozen record because it has to accept what platform
 * packages register; `getCapabilityMethod` is the read side.
 */
const CAPABILITY_METHODS = new Map<string, string>([
	["sendMedia", "sendMedia"],
	["presence", "sendPresence"],
	["readReceipts", "sendSeen"],
	["revoke", "revokeMessage"],
	["listChats", "getChats"],
	["readChat", "getChat"],
	["readContact", "getContact"],
	["logout", "logout"],
	["createGroup", "createGroup"],
	["readAbout", "getAbout"],
	["setAbout", "setAbout"],
	["setProfileName", "setProfileName"],
	["setProfilePicture", "setProfilePicture"],
	["block", "setBlocked"],
	["postStatus", "postStatus"],
	["subscribePresence", "subscribePresence"],
]);

/**
 * Teaches the core a capability a platform package adds.
 *
 * Pair it with a `declare module` augmentation of `AdapterCapabilities` — that
 * one is types only and vanishes at build, so without this call
 * `supportsCapability` would answer false for a method that is right there.
 *
 * Calling it twice with the same method is fine, which keeps a package that is
 * loaded more than once from failing. Registering a name that is already taken
 * by a *different* method throws: two features sharing one name would make the
 * answer depend on import order.
 */
export function registerCapability(capability: string, method: string): void {
	const existing = CAPABILITY_METHODS.get(capability);
	if (existing === method) return;
	if (existing) {
		throw new Error(
			`[NestWhats] Capability "${capability}" is already registered for method "${existing}" and cannot be re-registered for "${method}"`,
		);
	}
	CAPABILITY_METHODS.set(capability, method);
}

/** The adapter method a capability promises, or `undefined` if unregistered. */
export function getCapabilityMethod(
	capability: AdapterCapability,
): string | undefined {
	return CAPABILITY_METHODS.get(capability);
}

/**
 * Every capability the core knows about right now — the built-in ones plus
 * whatever the loaded platform packages registered.
 *
 * This is what a UI should enumerate. `Object.values(AdapterCapability)` gives
 * only the core's own, which is a different and usually wrong question.
 */
export function getKnownCapabilities(): AdapterCapability[] {
	return [...CAPABILITY_METHODS.keys()] as AdapterCapability[];
}

/**
 * Whether the adapter supports a capability.
 *
 * The implementation is the source of truth: a capability is supported when its
 * method is there. `unsupported` then takes some away — it can only subtract,
 * never add, so an adapter cannot claim something it did not implement and a
 * capability added to the core later is derived for everyone rather than
 * silently reported as missing.
 *
 * A capability nothing registered answers false: the type says it exists, so
 * the package declaring it was not loaded.
 */
export function supportsCapability(
	adapter: NestWhatsAdapter,
	capability: AdapterCapability,
): boolean {
	if (adapter.unsupported?.has(capability)) return false;
	const method = CAPABILITY_METHODS.get(capability);
	if (!method) return false;
	return (
		typeof (adapter as unknown as Record<string, unknown>)[method] ===
		"function"
	);
}

/** Every capability this adapter answers true for, derived and filtered. */
export function getCapabilities(
	adapter: NestWhatsAdapter,
): AdapterCapability[] {
	return getKnownCapabilities().filter((capability) =>
		supportsCapability(adapter, capability),
	);
}

/**
 * The method behind a capability, or an error naming what this platform cannot
 * do and which client asked.
 *
 * Shared so every entry point — `NestWhatsClient`, `NestWhatsMessagingService` —
 * refuses in the same words, with a `CapabilityNotSupportedError` carrying the
 * capability as a field rather than only in the text.
 */
export function requireCapability<K extends keyof NestWhatsAdapter>(
	adapter: NestWhatsAdapter,
	capability: AdapterCapability,
	method: K,
	clientName?: string,
	platformId?: string,
): NonNullable<NestWhatsAdapter[K]> {
	if (
		!supportsCapability(adapter, capability) ||
		typeof adapter[method] !== "function"
	) {
		throw new CapabilityNotSupportedError(
			capability,
			clientName ?? "default",
			platformId,
		);
	}
	return adapter[method] as NonNullable<NestWhatsAdapter[K]>;
}
