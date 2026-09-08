import type { Chat, ChatUpdate } from "@whiskeysockets/baileys";
import { toMillis } from "./structures/timestamp.js";

/**
 * What the client knows about its conversations, built from the events
 * Baileys emits.
 *
 * Baileys is a stateless socket by design: it reports what happens and keeps
 * nothing between restarts, and its documentation is explicit that
 * maintaining chat state is the application's job. For NestWhats the adapter
 * *is* that layer — without this, `getChats` could only ask WhatsApp for the
 * groups, and every field a chat list needs (name, unread count, archived,
 * pinned, muted, last activity) would be undefined on a direct conversation.
 *
 * It holds metadata only — never messages — so it stays small: a history sync
 * delivers thousands of chats but only a few hundred bytes each. `max` bounds
 * it anyway, dropping the least recently active first, so a long-lived client
 * on a busy account cannot grow without limit.
 */
export class ChatStore {
	private readonly chats = new Map<string, Chat>();

	public constructor(private readonly max = 1000) {}

	/** New chats, or a full replacement for ones already known. */
	public upsert(chats: readonly Chat[]): void {
		for (const chat of chats) {
			if (!chat.id) continue;
			this.chats.set(chat.id, { ...this.chats.get(chat.id), ...chat });
		}
		this.evict();
	}

	/**
	 * Partial changes — an unread count, an archive flag. An update for a chat
	 * that was never upserted still creates it: WhatsApp reports the change
	 * without resending the chat, and a half-known chat beats none.
	 */
	public update(updates: readonly ChatUpdate[]): void {
		for (const update of updates) {
			if (!update.id) continue;
			const { conditional: _conditional, ...fields } = update;
			this.chats.set(update.id, { ...this.chats.get(update.id), ...fields });
		}
		this.evict();
	}

	public remove(ids: readonly string[]): void {
		for (const id of ids) this.chats.delete(id);
	}

	public get(jid: string): Chat | undefined {
		return this.chats.get(jid);
	}

	/** Every known chat, most recently active first. */
	public all(): Chat[] {
		return [...this.chats.values()].sort(
			(a, b) => activityOf(b) - activityOf(a),
		);
	}

	public get size(): number {
		return this.chats.size;
	}

	public clear(): void {
		this.chats.clear();
	}

	/**
	 * Only when over the limit, and in one pass: a history sync inserts
	 * thousands at once, and sorting on every insert would cost far more than
	 * the trimming saves.
	 */
	private evict(): void {
		if (this.chats.size <= this.max) return;
		const byActivity = [...this.chats.entries()].sort(
			(a, b) => activityOf(a[1]) - activityOf(b[1]),
		);
		for (const [id] of byActivity.slice(0, this.chats.size - this.max)) {
			this.chats.delete(id);
		}
	}
}

/** Epoch milliseconds of the last thing that happened in a chat, or 0. */
export function activityOf(chat: Chat): number {
	return Math.max(
		toMillis(chat.conversationTimestamp),
		toMillis(chat.lastMessageRecvTimestamp),
	);
}

/** Whether a mute is still in force; WhatsApp stamps when it ends. */
export function isMuted(chat: Chat): boolean {
	const endsAt = toMillis(chat.muteEndTime);
	if (endsAt === 0) return false;
	// A negative stamp is WhatsApp's "muted with no end".
	return endsAt < 0 || endsAt > Date.now();
}
