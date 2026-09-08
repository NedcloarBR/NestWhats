/**
 * A virtual client as written to storage: the configuration needed to bring it
 * back, nothing else. Clients declared in `forRoot` are never stored — they are
 * recreated from code on every boot.
 *
 * Credentials are NOT here: those belong to the adapter's auth strategy
 * (whatsapp-web.js keeps them under `.wwebjs_auth/session-<name>`). Losing this
 * file means the client is not recreated; losing the credentials means it is
 * recreated and asks to authenticate again.
 */
export interface PersistedVirtualClient {
	name: string;
	/** Adapter class name, resolved against the adapters given to `forRoot`. */
	adapter?: string;
	options?: Record<string, unknown>;
	prefix?: string;
	ignoreSelf?: boolean;
}

/** What is persisted: the virtual clients to bring back on the next boot. */
export interface VirtualClientStorageState {
	virtualClients: PersistedVirtualClient[];
}

/**
 * Where virtual clients are kept between restarts.
 *
 * Implement it to store them somewhere other than a JSON file — a database, or
 * a shared store when several instances must agree on which clients exist.
 * Clients declared in code are never written here; they come from the module.
 */
export interface VirtualClientStorageAdapter {
	load(): VirtualClientStorageState | Promise<VirtualClientStorageState>;
	save(state: VirtualClientStorageState): void | Promise<void>;
	/** Optional: react to the file changing underneath the process. */
	watch?(
		onChange: (state: VirtualClientStorageState | null, error?: Error) => void,
	): () => void;
}
