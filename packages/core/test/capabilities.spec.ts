import { describe, expect, it } from "vitest";
import type { NestWhatsAdapter } from "../src/adapter/adapter.interface.js";
import {
	AdapterCapability,
	getCapabilities,
	getCapabilityMethod,
	getKnownCapabilities,
	registerCapability,
	requireCapability,
	supportsCapability,
} from "../src/adapter/adapter-capability.js";
import { CapabilityNotSupportedError } from "../src/adapter/capability-error.js";

/** The mandatory block and nothing else, so every capability derives to false. */
function bareAdapter(extra: Record<string, unknown> = {}): NestWhatsAdapter {
	return {
		initialize: async () => {},
		destroy: async () => {},
		on() {
			return this;
		},
		once() {
			return this;
		},
		off() {
			return this;
		},
		getInfo: () => undefined,
		sendMessage: async () => ({}) as never,
		raw: {},
		...extra,
	} as unknown as NestWhatsAdapter;
}

describe("supportsCapability", () => {
	// The whole design rests on this: implementing the method is the
	// declaration, so there is no second list to keep in sync.
	it("is true when the method is implemented", () => {
		const adapter = bareAdapter({ sendMedia: async () => ({}) });
		expect(supportsCapability(adapter, AdapterCapability.SendMedia)).toBe(true);
	});

	it("is false when it is not", () => {
		expect(supportsCapability(bareAdapter(), AdapterCapability.SendMedia)).toBe(
			false,
		);
	});

	it("is false when the member is present but not a function", () => {
		const adapter = bareAdapter({ sendMedia: "yes" });
		expect(supportsCapability(adapter, AdapterCapability.SendMedia)).toBe(
			false,
		);
	});

	it("is false for a capability nothing registered", () => {
		const adapter = bareAdapter({ sendTemplate: async () => ({}) });
		expect(supportsCapability(adapter, "template" as AdapterCapability)).toBe(
			false,
		);
	});
});

describe("the unsupported deny-list", () => {
	// It can only subtract. An adapter must not be able to claim something it
	// never implemented, and the same class serving a differently-onboarded
	// account has to be able to say it can do less.
	it("takes a capability away even though the method is there", () => {
		const adapter = bareAdapter({
			sendMedia: async () => ({}),
			unsupported: new Set([AdapterCapability.SendMedia]),
		});
		expect(supportsCapability(adapter, AdapterCapability.SendMedia)).toBe(
			false,
		);
	});

	it("cannot add one that was never implemented", () => {
		const adapter = bareAdapter({ unsupported: new Set<string>() });
		expect(supportsCapability(adapter, AdapterCapability.PostStatus)).toBe(
			false,
		);
	});

	it("leaves the other capabilities alone", () => {
		const adapter = bareAdapter({
			sendMedia: async () => ({}),
			sendSeen: async () => {},
			unsupported: new Set([AdapterCapability.SendMedia]),
		});
		expect(supportsCapability(adapter, AdapterCapability.ReadReceipts)).toBe(
			true,
		);
	});
});

describe("getCapabilities", () => {
	it("lists exactly what the adapter implements", () => {
		const adapter = bareAdapter({
			sendMedia: async () => ({}),
			getChats: async () => [],
		});
		expect(getCapabilities(adapter).sort()).toEqual(
			[AdapterCapability.SendMedia, AdapterCapability.ListChats].sort(),
		);
	});

	it("is empty for an adapter with only the mandatory block", () => {
		expect(getCapabilities(bareAdapter())).toEqual([]);
	});
});

describe("registerCapability", () => {
	it("makes a new capability derive like a built-in one", () => {
		registerCapability("spec.template", "sendSpecTemplate");
		const adapter = bareAdapter({ sendSpecTemplate: async () => ({}) });
		expect(
			supportsCapability(adapter, "spec.template" as AdapterCapability),
		).toBe(true);
		expect(getKnownCapabilities()).toContain("spec.template");
	});

	// A package loaded twice must not blow up.
	it("is idempotent for the same method", () => {
		registerCapability("spec.idempotent", "sendSpecIdempotent");
		expect(() =>
			registerCapability("spec.idempotent", "sendSpecIdempotent"),
		).not.toThrow();
	});

	// Two features sharing one name would make the answer depend on import
	// order, which is the kind of bug nobody ever finds.
	it("throws when a name is claimed for a different method", () => {
		registerCapability("spec.clash", "sendSpecClash");
		expect(() => registerCapability("spec.clash", "somethingElse")).toThrow(
			/already registered/,
		);
	});
});

describe("getKnownCapabilities", () => {
	it("includes every built-in capability", () => {
		const known = getKnownCapabilities();
		for (const capability of Object.values(AdapterCapability)) {
			expect(known).toContain(capability);
		}
	});
});

describe("getCapabilityMethod", () => {
	it("names the method a capability promises", () => {
		expect(getCapabilityMethod(AdapterCapability.Presence)).toBe(
			"sendPresence",
		);
	});

	it("is undefined for an unregistered capability", () => {
		expect(
			getCapabilityMethod("spec.unregistered" as AdapterCapability),
		).toBeUndefined();
	});
});

describe("requireCapability", () => {
	it("returns the method when it is there", () => {
		const sendMedia = async () => ({});
		const adapter = bareAdapter({ sendMedia });
		expect(
			requireCapability(adapter, AdapterCapability.SendMedia, "sendMedia"),
		).toBe(sendMedia);
	});

	// The error carries the capability as a field, so a caller can branch on it
	// instead of matching on the message text.
	it("throws a CapabilityNotSupportedError naming the capability and client", () => {
		expect.assertions(3);
		try {
			requireCapability(
				bareAdapter(),
				AdapterCapability.PostStatus,
				"postStatus",
				"business",
				"baileys",
			);
		} catch (err) {
			expect(err).toBeInstanceOf(CapabilityNotSupportedError);
			expect((err as CapabilityNotSupportedError).capability).toBe(
				AdapterCapability.PostStatus,
			);
			expect((err as CapabilityNotSupportedError).client).toBe("business");
		}
	});

	it("throws for a denied capability even though the method exists", () => {
		const adapter = bareAdapter({
			sendMedia: async () => ({}),
			unsupported: new Set([AdapterCapability.SendMedia]),
		});
		expect(() =>
			requireCapability(adapter, AdapterCapability.SendMedia, "sendMedia"),
		).toThrow(CapabilityNotSupportedError);
	});
});
