/** What is persisted between restarts: which handlers are bound to which client. */
export interface WebhookStorageState {
	/** Handler keys bound per client. */
	bindings: Record<string, string[]>;
}

/**
 * Where runtime bindings are kept. Implement it to store them somewhere other
 * than a JSON file — a database, or a shared cache when several instances need
 * the same bindings.
 *
 * `watch` is optional: implement it and the service picks up changes made to
 * the store from outside the process.
 */
export interface WebhookStorageAdapter {
	load(): WebhookStorageState | Promise<WebhookStorageState>;
	save(state: WebhookStorageState): void | Promise<void>;
	watch?(
		onChange: (state: WebhookStorageState | null, error?: Error) => void,
	): () => void;
}
