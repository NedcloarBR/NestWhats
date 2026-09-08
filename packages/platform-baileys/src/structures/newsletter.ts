import type { NewsletterMetadata } from "@whiskeysockets/baileys";
import type { NestWhatsMedia } from "nestwhats";
import { toCanonicalJid, toNativeJid } from "./jid.js";
import type { BaileysSocketHandle } from "./socket-handle.js";

/**
 * A WhatsApp channel ("newsletter" in the protocol).
 *
 * Channels are a Baileys-only capability, so this is the platform's own
 * vocabulary rather than a core structure: the id is canonical like every
 * other id this adapter hands out, and the full `NewsletterMetadata` is on
 * `raw`. What a follower can do and what an admin can do are both here;
 * WhatsApp answers at call time whether this account is allowed.
 *
 * Posts from channels this account follows arrive through the ordinary
 * `messagesUpsert` event with a `…@newsletter` chat id. There is no method to
 * fetch past posts: Baileys returns the raw stanza for that and does not
 * decode it.
 */
export class BaileysNewsletter {
	public constructor(
		public readonly raw: NewsletterMetadata,
		private readonly handle: BaileysSocketHandle,
	) {}

	private get jid(): string {
		return this.raw.id;
	}

	/** Canonical id, `…@newsletter`. */
	public get id() {
		return toCanonicalJid(this.raw.id);
	}

	public get name() {
		return this.raw.name;
	}

	public get description() {
		return this.raw.description ?? undefined;
	}

	/** The part after `whatsapp.com/channel/`, when WhatsApp reports it. */
	public get inviteCode() {
		return this.raw.invite ?? undefined;
	}

	/** Subscriber count at the time the metadata was fetched. */
	public get subscriberCount() {
		return this.raw.subscribers ?? undefined;
	}

	public get isVerified() {
		return this.raw.verification === "VERIFIED";
	}

	public get isMuted() {
		return this.raw.mute_state === "ON";
	}

	public async follow(): Promise<void> {
		await this.handle.socket.newsletterFollow(this.jid);
	}

	public async unfollow(): Promise<void> {
		await this.handle.socket.newsletterUnfollow(this.jid);
	}

	public async mute(): Promise<void> {
		await this.handle.socket.newsletterMute(this.jid);
	}

	public async unmute(): Promise<void> {
		await this.handle.socket.newsletterUnmute(this.jid);
	}

	/** Admin only. */
	public async setName(name: string): Promise<void> {
		await this.handle.socket.newsletterUpdateName(this.jid, name);
	}

	/** Admin only. */
	public async setDescription(description: string): Promise<void> {
		await this.handle.socket.newsletterUpdateDescription(this.jid, description);
	}

	/** Admin only. */
	public async setPicture(media: NestWhatsMedia): Promise<void> {
		await this.handle.socket.newsletterUpdatePicture(this.jid, media.data);
	}

	/** Admin only. */
	public async removePicture(): Promise<void> {
		await this.handle.socket.newsletterRemovePicture(this.jid);
	}

	/**
	 * Reacts to a post. Channel posts are addressed by their `server_id`, which
	 * is on the raw message's key as `server_id`, not by the message id; an
	 * empty string removes the reaction.
	 */
	public async react(serverId: string, emoji: string): Promise<void> {
		await this.handle.socket.newsletterReactMessage(
			this.jid,
			serverId,
			emoji || undefined,
		);
	}

	/** Fresh from WhatsApp, unlike `subscriberCount`. */
	public async getSubscriberCount(): Promise<number> {
		const { subscribers } = await this.handle.socket.newsletterSubscribers(
			this.jid,
		);
		return subscribers;
	}

	/** Owner only. Hands the channel to another admin. */
	public async transferOwnership(adminId: string): Promise<void> {
		await this.handle.socket.newsletterChangeOwner(
			this.jid,
			toNativeJid(adminId),
		);
	}

	/** Owner only. */
	public async delete(): Promise<void> {
		await this.handle.socket.newsletterDelete(this.jid);
	}
}
