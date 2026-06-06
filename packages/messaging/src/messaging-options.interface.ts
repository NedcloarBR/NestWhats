import type { ModuleMetadata } from "@nestjs/common";
import type { WebhookStorageAdapter } from "./storage";

export interface NestWhatsMessagingLoggerOptions {
	bind?: boolean;
	unbind?: boolean;
	restore?: boolean;
	fileChanged?: boolean;
	stale?: boolean;
	syntaxError?: boolean;
	maxWarningCount?: number;
}

export interface NestWhatsMessagingOptions {
	storage?: WebhookStorageAdapter;
	logger?: boolean | NestWhatsMessagingLoggerOptions;
}

export interface NestWhatsMessagingAsyncOptions
	extends Pick<ModuleMetadata, "imports"> {
	inject?: any[];
	useFactory: (
		...args: any[]
	) => NestWhatsMessagingOptions | Promise<NestWhatsMessagingOptions>;
}
