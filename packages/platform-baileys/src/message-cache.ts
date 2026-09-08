import type { proto, WAMessage, WAMessageKey } from "@whiskeysockets/baileys";

/**
 * The messages this adapter has seen — key, timestamp and content, never
 * media bytes.
 *
 * Baileys keeps nothing between restarts and asks the application for what it
 * needs back, so this is what answers four different questions:
 *
 * - `getMessage`, which Baileys calls to re-encrypt a message a recipient
 *   could not decrypt. Without it that message sits on the other side as
 *   "waiting for this message" forever — the single most common complaint in
 *   Baileys' own FAQ.
 * - `revokeMessage(id)`, which needs the chat and `fromMe` that go with an id.
 * - `sendSeen(chatId)` and every `chatModify` that archives, clears or deletes
 *   a chat, which need the last message in it as a marker.
 * - poll votes, which are decrypted against the poll message they answer.
 *
 * Bounded, oldest out first, so a long-lived client does not grow without
 * limit. Content is the protobuf message — text, captions and media
 * descriptors — not the media itself.
 */
export class MessageCache {
	private readonly byId = new Map<string, WAMessage>();
	private readonly lastByChat = new Map<string, WAMessage>();
	private readonly lastReceivedByChat = new Map<string, WAMessage>();

	public constructor(private readonly max = 2000) {}

	public remember(message: WAMessage): void {
		const { key } = message;
		if (!key.id || !key.remoteJid) return;
		this.byId.delete(key.id);
		this.byId.set(key.id, message);
		if (this.byId.size > this.max) {
			const oldest = this.byId.keys().next().value;
			if (oldest !== undefined) this.byId.delete(oldest);
		}
		this.lastByChat.set(key.remoteJid, message);
		// Only what the other side sent can be marked read.
		if (!key.fromMe) this.lastReceivedByChat.set(key.remoteJid, message);
	}

	public get(id: string): WAMessage | undefined {
		return this.byId.get(id);
	}

	public key(id: string): WAMessageKey | undefined {
		return this.byId.get(id)?.key;
	}

	/** The content Baileys needs to re-encrypt a message that failed to decrypt. */
	public content(id: string): proto.IMessage | undefined {
		return this.byId.get(id)?.message ?? undefined;
	}

	/** The last message seen in a chat, whoever sent it. */
	public lastMessage(nativeJid: string): WAMessage | undefined {
		return this.lastByChat.get(nativeJid);
	}

	/** The last message received in a chat — what WhatsApp wants as a marker. */
	public lastReceived(nativeJid: string): WAMessage | undefined {
		return this.lastReceivedByChat.get(nativeJid);
	}

	public clear(): void {
		this.byId.clear();
		this.lastByChat.clear();
		this.lastReceivedByChat.clear();
	}
}
