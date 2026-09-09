import { watch } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
	WebhookStorageAdapter,
	WebhookStorageState,
} from "./webhook-storage.interface.js";

function parse(raw: unknown): WebhookStorageState {
	if (raw && typeof raw === "object" && "bindings" in raw) {
		return { bindings: (raw as WebhookStorageState).bindings };
	}
	// Pre-1.0 files were a bare map of client -> handler keys.
	return { bindings: raw as Record<string, string[]> };
}

/**
 * Default storage: bindings in a JSON file, watched for outside edits.
 *
 * @param filePath - defaults to `.nestwhats/webhook-bindings.json`, relative to
 * the working directory.
 */
export class JsonFileWebhookStorage implements WebhookStorageAdapter {
	public constructor(
		private readonly filePath: string = ".nestwhats/webhook-bindings.json",
	) {}

	public async load(): Promise<WebhookStorageState> {
		let raw: string;
		try {
			raw = await readFile(this.filePath, "utf-8");
		} catch {
			return { bindings: {} };
		}
		return parse(JSON.parse(raw));
	}

	public async save(state: WebhookStorageState): Promise<void> {
		await mkdir(dirname(this.filePath), { recursive: true });
		await writeFile(this.filePath, JSON.stringify(state, null, 2), "utf-8");
	}

	public watch(
		onChange: (state: WebhookStorageState | null, error?: Error) => void,
	): () => void {
		let debounce: NodeJS.Timeout | undefined;
		let watcher: ReturnType<typeof watch> | undefined;

		const trigger = () => {
			clearTimeout(debounce);
			debounce = setTimeout(() => {
				readFile(this.filePath, "utf-8")
					.then((raw) => {
						try {
							onChange(parse(JSON.parse(raw)));
						} catch (err) {
							onChange(null, err as Error);
						}
					})
					.catch(() => {});
			}, 150);
		};

		try {
			watcher = watch(this.filePath, trigger);
		} catch {
			return () => {};
		}

		return () => {
			watcher?.close();
			clearTimeout(debounce);
		};
	}
}
