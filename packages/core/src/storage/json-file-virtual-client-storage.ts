import { watch } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
	VirtualClientStorageAdapter,
	VirtualClientStorageState,
} from "./virtual-client-storage.interface.js";

const EMPTY: VirtualClientStorageState = { virtualClients: [] };

function parse(raw: string): VirtualClientStorageState {
	const data = JSON.parse(raw) as Partial<VirtualClientStorageState>;
	return {
		virtualClients: Array.isArray(data.virtualClients)
			? data.virtualClients
			: [],
	};
}

/** Keeps virtual clients in a JSON file next to the app. */
export class JsonFileVirtualClientStorage
	implements VirtualClientStorageAdapter
{
	public constructor(
		private readonly filePath: string = ".nestwhats/virtual-clients.json",
	) {}

	public async load(): Promise<VirtualClientStorageState> {
		let raw: string;
		try {
			raw = await readFile(this.filePath, "utf-8");
		} catch {
			return EMPTY;
		}
		return parse(raw);
	}

	public async save(state: VirtualClientStorageState): Promise<void> {
		await mkdir(dirname(this.filePath), { recursive: true });
		await writeFile(this.filePath, JSON.stringify(state, null, 2), "utf-8");
	}

	public watch(
		onChange: (state: VirtualClientStorageState | null, error?: Error) => void,
	): () => void {
		let debounce: NodeJS.Timeout | undefined;
		let watcher: ReturnType<typeof watch> | undefined;

		const trigger = () => {
			clearTimeout(debounce);
			debounce = setTimeout(() => {
				readFile(this.filePath, "utf-8")
					.then((raw) => {
						try {
							onChange(parse(raw));
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
