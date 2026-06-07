export interface VirtualClientConfig {
	name: string;
	prefix?: string;
	printQR?: boolean;
}

export interface WebhookStorageState {
	bindings: Record<string, string[]>;
	virtualClients?: VirtualClientConfig[];
}

export interface WebhookStorageAdapter {
	load(): WebhookStorageState | Promise<WebhookStorageState>;
	save(state: WebhookStorageState): void | Promise<void>;
	watch?(
		onChange: (state: WebhookStorageState | null, error?: Error) => void,
	): () => void;
}
