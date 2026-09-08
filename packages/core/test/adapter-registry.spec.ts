import { describe, expect, it } from "vitest";
import type { NestWhatsAdapterFactory } from "../src/adapter/adapter-factory.interface.js";
import {
	assertIsAdapterFactory,
	buildAdapterRegistry,
	resolveFactory,
	toAdapterFactory,
} from "../src/module/adapter-registry.js";

class FakeFactory implements NestWhatsAdapterFactory {
	public readonly id: string;

	public constructor(options: { id?: string } = {}) {
		this.id = options.id ?? "fake";
	}

	public create() {
		return {} as never;
	}
}

class OtherFactory extends FakeFactory {
	public constructor(options: { id?: string } = {}) {
		super({ id: options.id ?? "other" });
	}
}

describe("assertIsAdapterFactory", () => {
	it("accepts a factory", () => {
		expect(() => assertIsAdapterFactory(new FakeFactory())).not.toThrow();
	});

	it("names the members that are missing", () => {
		expect(() => assertIsAdapterFactory({ id: "x" })).toThrow(/create/);
	});

	it("rejects an empty id", () => {
		expect(() =>
			assertIsAdapterFactory({ id: "", create: () => ({}) }),
		).toThrow(/id/);
	});

	// Passing the adapter used to be right, so the message has to say what to
	// pass instead of only what is missing.
	it("tells an adapter apart from a factory", () => {
		expect(() =>
			assertIsAdapterFactory({ initialize: () => {}, destroy: () => {} }),
		).toThrow(/This looks like an adapter/);
	});

	it.each([
		undefined,
		null,
		"whatsapp-web.js",
		42,
	])("rejects %p", (candidate) => {
		expect(() => assertIsAdapterFactory(candidate)).toThrow(/not a NestWhats/);
	});
});

describe("toAdapterFactory", () => {
	it("builds a class with its defaults", () => {
		const factory = toAdapterFactory(FakeFactory);
		expect(factory).toBeInstanceOf(FakeFactory);
		expect(factory.id).toBe("fake");
	});

	it("passes an instance through untouched", () => {
		const instance = new FakeFactory({ id: "configured" });
		expect(toAdapterFactory(instance)).toBe(instance);
	});
});

describe("buildAdapterRegistry", () => {
	it("indexes by id", () => {
		const registry = buildAdapterRegistry([FakeFactory, new OtherFactory()]);
		expect([...registry.keys()]).toEqual(["fake", "other"]);
	});

	// Two factories under one id would make `resolveFactory` depend on
	// declaration order, so this has to be an error rather than a last-wins.
	it("refuses a duplicate id", () => {
		expect(() =>
			buildAdapterRegistry([new FakeFactory(), new FakeFactory()]),
		).toThrow(/appears more than once/);
	});

	it("is empty for no declarations", () => {
		expect(buildAdapterRegistry([]).size).toBe(0);
	});
});

describe("resolveFactory", () => {
	it("uses the only registered factory when none is named", () => {
		const registry = buildAdapterRegistry([FakeFactory]);
		expect(resolveFactory(registry, undefined, "personal").id).toBe("fake");
	});

	it("refuses to guess between several", () => {
		const registry = buildAdapterRegistry([FakeFactory, OtherFactory]);
		expect(() => resolveFactory(registry, undefined, "personal")).toThrow(
			/several adapters are registered/,
		);
	});

	it("resolves by id", () => {
		const registry = buildAdapterRegistry([FakeFactory, OtherFactory]);
		expect(resolveFactory(registry, "other", "personal").id).toBe("other");
	});

	it("resolves by instance", () => {
		const instance = new OtherFactory();
		const registry = buildAdapterRegistry([FakeFactory, instance]);
		expect(resolveFactory(registry, instance, "personal")).toBe(instance);
	});

	// Naming the class is the form that types a client's options, so it has to
	// resolve to the instance built from it.
	it("resolves by class", () => {
		const registry = buildAdapterRegistry([FakeFactory, OtherFactory]);
		expect(resolveFactory(registry, OtherFactory, "personal").id).toBe("other");
	});

	it("refuses a class registered twice under different ids", () => {
		const registry = buildAdapterRegistry([
			new FakeFactory({ id: "one" }),
			new FakeFactory({ id: "two" }),
		]);
		expect(() => resolveFactory(registry, FakeFactory, "personal")).toThrow(
			/registered more than once/,
		);
	});

	it("says which ids exist when a class is not registered", () => {
		const registry = buildAdapterRegistry([FakeFactory]);
		expect(() => resolveFactory(registry, OtherFactory, "personal")).toThrow(
			/registered: fake/,
		);
	});

	it("says which ids exist when an id is not registered", () => {
		const registry = buildAdapterRegistry([FakeFactory]);
		expect(() => resolveFactory(registry, "baileys", "personal")).toThrow(
			/registered: fake/,
		);
	});

	it.each([
		undefined,
		new Map(),
	])("refuses when nothing is registered (%p)", (registry) => {
		expect(() => resolveFactory(registry, undefined, "personal")).toThrow(
			/no adapters registered/,
		);
	});

	it("names the client in every message", () => {
		const registry = buildAdapterRegistry([FakeFactory, OtherFactory]);
		expect(() => resolveFactory(registry, undefined, "business")).toThrow(
			/"business"/,
		);
	});
});
