import * as fs from "node:fs";
import * as path from "node:path";
import { BaseLocaleLoader } from "./base-locale.loader";

export interface JSONLocaleLoaderOptions {
  basePath: string;
	ignore?: string[];
}

const DEFAULT_IGNORE = [".git", ".gitkeep", "crowdin.yml", "README.md"];

export class JSONLocaleLoader extends BaseLocaleLoader<JSONLocaleLoaderOptions> {
  public constructor(options: JSONLocaleLoaderOptions) {
    super({
      ignore: options.ignore ?? DEFAULT_IGNORE,
      ...options,
    });
  }

	public async load(): Promise<Record<string, Record<string, unknown>>> {
		const locales: Record<string, Record<string, unknown>> = {};

		const localeFolders = fs
			.readdirSync(this.options.basePath)
			.filter((f) => !this.options.ignore?.includes(f));

		for (const entry of localeFolders) {
			const entryPath = path.join(this.options.basePath, entry);
			const stat = fs.statSync(entryPath);

			if (stat.isDirectory()) {
				locales[entry] = this.loadDirectory(entryPath);
			} else if (path.extname(entry) === ".json") {
				const locale = path.basename(entry, ".json");
				locales[locale] = JSON.parse(fs.readFileSync(entryPath, "utf-8"));
			}
		}

		return locales;
	}

	private loadDirectory(dir: string): Record<string, unknown> {
		const result: Record<string, unknown> = {};
		const entries = fs.readdirSync(dir).filter((f) => !this.options.ignore?.includes(f));

		for (const entry of entries) {
			const entryPath = path.join(dir, entry);

			if (fs.statSync(entryPath).isDirectory()) {
				result[entry] = this.loadDirectory(entryPath);
			} else if (path.extname(entry) === ".json") {
				const key = path.basename(entry, ".json");
				result[key] = JSON.parse(fs.readFileSync(entryPath, "utf-8"));
			}
		}

		return result;
	}
}
