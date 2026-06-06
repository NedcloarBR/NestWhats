export type WebhookStorageState = Record<string, string[]>;

export interface WebhookStorageAdapter {
	load(): WebhookStorageState | Promise<WebhookStorageState>;
	save(state: WebhookStorageState): void | Promise<void>;
	watch?(
		onChange: (state: WebhookStorageState | null, error?: Error) => void,
	): () => void;
}
