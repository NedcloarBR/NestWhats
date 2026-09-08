import type { CacheStore } from "@whiskeysockets/baileys";

/**
 * A small time-to-live map in Baileys' own `CacheStore` shape.
 *
 * Baileys builds its internal caches with `@cacheable/node-cache`; the pieces
 * this adapter has to own — the message-retry counters, group metadata — need
 * the same interface but not another dependency, and what they need is a Map
 * with an expiry. Entries are evicted when read, and in bulk once the map
 * grows past `max`, so nothing has to run on a timer.
 */
export class TtlCache implements CacheStore {
	private readonly entries = new Map<string, { value: unknown; at: number }>();

	/**
	 * @param ttlMs - how long an entry stays valid.
	 * @param max - how many entries to keep; the oldest go first.
	 */
	public constructor(
		private readonly ttlMs: number,
		private readonly max = 1000,
	) {}

	public get<T>(key: string): T | undefined {
		const entry = this.entries.get(key);
		if (!entry) return undefined;
		if (Date.now() - entry.at > this.ttlMs) {
			this.entries.delete(key);
			return undefined;
		}
		return entry.value as T;
	}

	public set<T>(key: string, value: T): void {
		this.entries.set(key, { value, at: Date.now() });
		if (this.entries.size > this.max) this.evict();
	}

	public del(key: string): void {
		this.entries.delete(key);
	}

	public flushAll(): void {
		this.entries.clear();
	}

	private evict(): void {
		const now = Date.now();
		for (const [key, entry] of this.entries) {
			if (now - entry.at > this.ttlMs) this.entries.delete(key);
		}
		// Still over after dropping the stale ones: insertion order is age
		// order, so the front of the map is the oldest.
		let excess = this.entries.size - this.max;
		if (excess <= 0) return;
		for (const key of this.entries.keys()) {
			this.entries.delete(key);
			if (--excess <= 0) return;
		}
	}
}
