import type { AdapterOptionsSchema } from "nestwhats";

/** A `@Webhook()` handler as the page lists it. */
export interface WebhookHandlerInfo {
	/** `ClassName.methodName`, the name it is bound by. */
	key: string;
	/** The event it listens to. */
	event: string;
	/** Whether it fires every time or only once. */
	type: "on" | "once";
}

/**
 * The slice of `@nestwhats/webhook` the dashboard uses.
 *
 * A port rather than a direct import: the webhook package is an optional
 * dependency, and the dashboard renders without it.
 */
export interface WebhookServicePort {
	getHandlers(): WebhookHandlerInfo[];
	getBoundHandlers(options?: { client?: string }): string[];
	register(options?: { client?: string; handlers?: string[] }): void;
	unregister(options?: { client?: string; handlers?: string[] }): void;
	subscribe(listener: () => void): () => void;
}

/** An adapter the page can offer when creating a virtual client. */
export interface RegisteredAdapterInfo {
	/** The adapter's class name, which is how a virtual client names it. */
	name: string;
	/**
	 * The core's own schema type, not a copy: a local restatement drifted out of
	 * date once already, missing `radio`, object choices, `uiOnly`, `showWhen`
	 * and `advanced` while the page was rendering all of them.
	 */
	optionsSchema: AdapterOptionsSchema;
}

/** Virtual client lifecycle, owned by the core. */
export interface ClientManagerPort {
	createClient(options: {
		name: string;
		adapter?: string;
		options?: Record<string, unknown>;
		prefix?: string;
	}): Promise<void>;
	destroyClient(name: string): Promise<void>;
	updateClient(
		name: string,
		changes: { prefix?: string; options?: Record<string, unknown> },
	): Promise<void>;
	getRegisteredAdapters(): RegisteredAdapterInfo[];
	getPersistedVirtualClients(): {
		name: string;
		adapter?: string;
		options?: Record<string, unknown>;
		prefix?: string;
	}[];
}

/** Options for `NestWhatsDashboardModule.forRoot`. */
export interface NestWhatsDashboardOptions {
	/** Port the dashboard listens on; defaults to 3001. */
	port?: number;
	/** Path the page is served under; defaults to `nestwhats`. */
	path?: string;
	/**
	 * When set, the page asks for these credentials first.
	 *
	 * The dashboard creates and destroys clients, so leave this off only on a
	 * network you control.
	 */
	auth?: {
		username: string;
		password: string;
	};
	/**
	 * Show the webhook binding controls. Requires `@nestwhats/webhook` to be
	 * imported; without it the controls stay hidden.
	 */
	webhook?: boolean;
}
