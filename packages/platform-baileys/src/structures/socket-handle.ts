import type {
	Contact,
	SocketConfig,
	WAMessage,
	WASocket,
} from "@whiskeysockets/baileys";
import type { ChatStore } from "../chat-store.js";

/** The logger shape Baileys expects; it is not exported under its own name. */
export type BaileysLogger = SocketConfig["logger"];

/**
 * What a structure needs from the adapter that produced it.
 *
 * A socket is rebuilt on every reconnect, so structures never hold one: they
 * hold this handle and read `socket` at call time, which is why a message
 * received before a drop can still be replied to after it.
 */
export interface BaileysSocketHandle {
	/** The live socket. Throws before `initialize()` has built one. */
	readonly socket: WASocket;
	/** The connected account, once Baileys knows it. */
	readonly user: Contact | undefined;
	readonly baileysLogger: BaileysLogger;
	/** What the client knows about its conversations, when the store is on. */
	readonly chats: ChatStore | undefined;
	/**
	 * Tells the adapter about a message it did not see arrive — one this
	 * structure just sent — so operations that need a key or a chat marker can
	 * find it later.
	 */
	remember(message: WAMessage): void;
	/** The last message seen in a chat, whoever sent it. */
	lastMessage(nativeJid: string): WAMessage | undefined;
	/** The last message received in a chat. */
	lastReceived(nativeJid: string): WAMessage | undefined;
	/** Whether this account has the contact blocked, as far as it knows. */
	isBlocked(nativeJid: string): boolean | undefined;
}
