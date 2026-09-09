import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..", "src");

function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) return sourceFiles(path);
		return path.endsWith(".ts") ? [path] : [];
	});
}

/** Every `from "…"` and `import("…")` specifier in the package's sources. */
function specifiers(file: string): string[] {
	const source = readFileSync(file, "utf8");
	return [...source.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map(
		(match) => match[1],
	);
}

describe("ESM import specifiers", () => {
	const files = sourceFiles(SRC);

	it("finds sources to check", () => {
		expect(files.length).toBeGreaterThan(50);
	});

	// tsc emits specifiers untouched, and it resolves a subpath of a package
	// with no `exports` map the node10 way — so it accepts a missing extension
	// that Node then refuses at runtime. @nestjs 12 added a `"./*": "./*.js"`
	// wildcard that hides this, but 10 and 11 have no exports map and both are
	// in the peer range. Nothing in the build catches it; this does.
	it("gives every package subpath an explicit extension", () => {
		const offenders: string[] = [];

		for (const file of files) {
			for (const specifier of specifiers(file)) {
				const isRelative = specifier.startsWith(".");
				const isBuiltin = specifier.startsWith("node:");
				const isSubpath =
					specifier.split("/").length > (specifier.startsWith("@") ? 2 : 1);

				if (isRelative || isBuiltin || !isSubpath) continue;
				if (specifier.endsWith(".js") || specifier.endsWith(".json")) continue;

				offenders.push(`${file.slice(SRC.length + 1)} -> ${specifier}`);
			}
		}

		expect(offenders).toEqual([]);
	});

	// The same rule for our own files: NodeNext requires it, and a missing one
	// fails the build rather than runtime — but the assertion documents why
	// the suffix is there.
	it("gives every relative import an explicit extension", () => {
		const offenders: string[] = [];

		for (const file of files) {
			for (const specifier of specifiers(file)) {
				if (!specifier.startsWith(".")) continue;
				if (specifier.endsWith(".js") || specifier.endsWith(".json")) continue;
				offenders.push(`${file.slice(SRC.length + 1)} -> ${specifier}`);
			}
		}

		expect(offenders).toEqual([]);
	});
});
