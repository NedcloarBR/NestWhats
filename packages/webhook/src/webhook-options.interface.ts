import type { ModuleMetadata } from "@nestjs/common";
import type { WebhookStorageAdapter } from "./storage/index.js";

/**
 * Which of the webhook service's log lines to keep. Every flag defaults to on
 * when `logger: true`; turn off the noisy ones once a deployment is settled.
 */
export interface NestWhatsWebhookLoggerOptions {
	/** A handler was bound to a client. */
	bind?: boolean;
	/** A handler was unbound. */
	unbind?: boolean;
	/** Bindings were restored from storage at bootstrap. */
	restore?: boolean;
	/** The storage file changed outside the process and was reloaded. */
	fileChanged?: boolean;
	/** A stored binding names a handler that no longer exists in the code. */
	stale?: boolean;
	/** The storage file could not be parsed. */
	syntaxError?: boolean;
	/** Stop repeating the same warning after this many times. */
	maxWarningCount?: number;
}

/**
 * Options for `NestWhatsWebhookModule.forRoot`.
 *
 * Without `storage`, bindings live only for the current process — handlers bound
 * at runtime are gone after a restart.
 */
export interface NestWhatsWebhookOptions {
	/**
	 * Where bindings are kept. Without it they live only for the current
	 * process, so everything bound at runtime is gone after a restart.
	 */
	storage?: WebhookStorageAdapter;
	/** `true` for every log line, or an object to pick which ones. */
	logger?: boolean | NestWhatsWebhookLoggerOptions;
}

/**
 * `forRootAsync` form: builds {@link NestWhatsWebhookOptions} from injected
 * providers, for a storage adapter that depends on configuration.
 */
export interface NestWhatsWebhookAsyncOptions
	extends Pick<ModuleMetadata, "imports"> {
	inject?: any[];
	useFactory: (
		...args: any[]
	) => NestWhatsWebhookOptions | Promise<NestWhatsWebhookOptions>;
}
