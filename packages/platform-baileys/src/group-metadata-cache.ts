import type { GroupMetadata } from "@whiskeysockets/baileys";
import { TtlCache } from "./ttl-cache.js";

/** Baileys' own suggestion, and long enough that a busy group is not refetched per message. */
const DEFAULT_TTL_MS = 5 * 60_000;

/**
 * Group metadata, remembered between sends.
 *
 * Baileys asks for a group's participant list every time it encrypts a
 * message for that group. Without a cache that is one round trip per message,
 * which its own FAQ names as the way accounts get rate-limited and banned for
 * sending in groups. This is what `cachedGroupMetadata` is for.
 *
 * Anything that changes a group — `groups.update`, `group-participants.update`
 * — drops its entry rather than patching it: a participant list that is
 * subtly wrong encrypts for the wrong people, and refetching once is cheap
 * next to that.
 */
export class GroupMetadataCache {
	private readonly cache: TtlCache;

	public constructor(ttlMs: number = DEFAULT_TTL_MS, max = 500) {
		this.cache = new TtlCache(ttlMs, max);
	}

	public get(jid: string): GroupMetadata | undefined {
		return this.cache.get<GroupMetadata>(jid);
	}

	public set(metadata: GroupMetadata): void {
		if (metadata.id) this.cache.set(metadata.id, metadata);
	}

	public invalidate(jid: string | null | undefined): void {
		if (jid) this.cache.del(jid);
	}

	public clear(): void {
		this.cache.flushAll();
	}
}
