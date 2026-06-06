import { watch } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
	WebhookStorageAdapter,
	WebhookStorageState,
} from "./webhook-storage.interface";

export class JsonFileWebhookStorage implements WebhookStorageAdapter {
	public constructor(
		private readonly filePath: string = ".nestwhats/webhook-state.json",
	) {}

	public async load(): Promise<WebhookStorageState> {
		let raw: string;
		try {
			raw = await readFile(this.filePath, "utf-8");
		} catch {
			return {};
		}
		return JSON.parse(raw) as WebhookStorageState;
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
							onChange(JSON.parse(raw) as WebhookStorageState);
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
