import { defineConfig, mergeConfig } from "vitest/config";
import shared from "../../vitest.shared.js";

export default mergeConfig(
	shared,
	defineConfig({ test: { name: "core", root: import.meta.dirname } }),
);
