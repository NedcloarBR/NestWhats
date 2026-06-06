export interface WebhookHandlerInfo {
	key: string;
	event: string;
	type: "on" | "once";
}

export interface WebhookServicePort {
	getHandlers(): WebhookHandlerInfo[];
	getBoundHandlers(options?: { client?: string }): string[];
	register(options?: { client?: string; handlers?: string[] }): void;
	unregister(options?: { client?: string; handlers?: string[] }): void;
	subscribe(listener: () => void): () => void;
}

export interface NestWhatsDashboardOptions {
	port?: number;
	path?: string;
	auth?: {
		username: string;
		password: string;
	};
	webhook?: boolean;
}
