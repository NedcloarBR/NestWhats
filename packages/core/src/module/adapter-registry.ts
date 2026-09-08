import type { NestWhatsAdapterFactory } from "../adapter/adapter-factory.interface.js";
import type {
	AdapterDeclaration,
	AdapterRef,
	AdapterRegistry,
} from "./module-options.interface.js";

/** What a factory has to provide before the registry will take it. */
const REQUIRED_FACTORY_MEMBERS = ["id", "create"] as const;

function describe(candidate: unknown): string {
	return (
		(candidate as { id?: string })?.id ??
		(candidate as { constructor?: { name?: string } })?.constructor?.name ??
		typeof candidate
	);
}

/**
 * Fails loudly when something that is not a factory reaches `adapters`.
 *
 * The common mistake is passing the adapter itself, which used to be right, so
 * the message says what to pass instead rather than only what is missing.
 */
export function assertIsAdapterFactory(
	candidate: unknown,
): asserts candidate is NestWhatsAdapterFactory {
	const value = candidate as Record<string, unknown> | undefined;
	const missing = REQUIRED_FACTORY_MEMBERS.filter((member) =>
		member === "id"
			? typeof value?.id !== "string" || !value.id
			: typeof value?.[member] !== "function",
	);
	if (!missing.length) return;

	const isAdapter = typeof value?.initialize === "function";
	throw new Error(
		`[NestWhats] "${describe(candidate)}" is not a NestWhats adapter factory — it is missing: ${missing.join(", ")}. ${
			isAdapter
				? "This looks like an adapter: 'adapters' takes the factory that builds them, e.g. new WhatsAppWebJsAdapterFactory({ … })"
				: "Pass a factory, e.g. new WhatsAppWebJsAdapterFactory({ … })"
		}`,
	);
}

/** A class declaration becomes an instance built with its defaults. */
export function toAdapterFactory(
	declaration: AdapterDeclaration,
): NestWhatsAdapterFactory {
	const factory =
		typeof declaration === "function" ? new declaration() : declaration;
	assertIsAdapterFactory(factory);
	return factory;
}

/** Indexes the declared factories by id, rejecting duplicates. */
export function buildAdapterRegistry(
	declarations: AdapterDeclaration[],
): AdapterRegistry {
	const registry: AdapterRegistry = new Map();
	for (const declaration of declarations) {
		const factory = toAdapterFactory(declaration);
		if (registry.has(factory.id)) {
			throw new Error(
				`[NestWhats] Adapter id "${factory.id}" appears more than once in the adapters array — give one of them its own id`,
			);
		}
		registry.set(factory.id, factory);
	}
	return registry;
}

/**
 * The factory a client asked for.
 *
 * Naming none is fine when exactly one is declared; past that the client has to
 * say which, because guessing would tie the answer to declaration order.
 */
export function resolveFactory(
	registry: AdapterRegistry | undefined,
	ref: AdapterRef | undefined,
	clientName: string,
): NestWhatsAdapterFactory {
	if (!registry?.size) {
		throw new Error(
			`[NestWhats] Cannot create client "${clientName}" — no adapters registered in the module`,
		);
	}

	if (ref !== undefined) {
		// A class names every registered factory built from it. Normally that is
		// exactly one; two would make the reference ambiguous, so say so instead
		// of picking whichever was declared first.
		if (typeof ref === "function") {
			const matches = [...registry.values()].filter(
				(factory) => factory.constructor === ref,
			);
			if (matches.length === 1) return matches[0];
			throw new Error(
				matches.length
					? `[NestWhats] Cannot create client "${clientName}" — "${ref.name}" is registered more than once (${matches.map((f) => `"${f.id}"`).join(", ")}), so name the one this client runs on by its id`
					: `[NestWhats] Cannot create client "${clientName}" — no adapter built from "${ref.name}" is in the adapters array (registered: ${[...registry.keys()].join(", ")})`,
			);
		}

		const id = typeof ref === "string" ? ref : ref.id;
		const factory = registry.get(id);
		if (!factory) {
			throw new Error(
				`[NestWhats] Cannot create client "${clientName}" — adapter "${id}" not found in the adapters array (registered: ${[...registry.keys()].join(", ")})`,
			);
		}
		return factory;
	}

	if (registry.size > 1) {
		throw new Error(
			`[NestWhats] Cannot create client "${clientName}" — several adapters are registered (${[...registry.keys()].join(", ")}), so name the one this client runs on via the adapter option`,
		);
	}

	const [only] = registry.values();
	return only;
}
