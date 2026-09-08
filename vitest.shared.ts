import { defineConfig } from "vitest/config";

/**
 * Shared Vitest setup. Vitest runs ESM and TypeScript natively, which is what
 * these packages publish, so there is no transform to configure and no
 * `--experimental-vm-modules` to remember.
 */
export default defineConfig({
	test: {
		environment: "node",
		include: ["test/**/*.spec.ts"],
		// `globals` stays off: importing `describe`/`it`/`expect` keeps a test
		// file readable on its own and needs no ambient types.
		globals: false,
		coverage: {
			provider: "v8",
			include: ["src/**/*.ts"],
			exclude: ["src/**/index.ts", "src/**/*.interface.ts"],
			reporter: ["text-summary", "lcov"],
		},
	},
	// Source imports are written for NodeNext, which requires the `.js` suffix;
	// at test time the file next door is still `.ts`.
	resolve: {
		alias: [{ find: /^(\.{1,2}\/.*)\.js$/, replacement: "$1" }],
	},
});
