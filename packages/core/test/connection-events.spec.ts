import { describe, expect, it } from "vitest";
import { ClientStatus } from "../src/adapter/client-status.enum.js";
import { deriveConnectionEvents } from "../src/adapter/derive-connection-events.js";
import {
	DisconnectKind,
	isTerminalDisconnect,
} from "../src/adapter/disconnect-reason.js";

const names = (events: ReturnType<typeof deriveConnectionEvents>): string[] =>
	events.map(([name]) => name);

describe("deriveConnectionEvents", () => {
	it("emits ready on the transition into Ready", () => {
		const events = deriveConnectionEvents(
			{ status: ClientStatus.Ready },
			ClientStatus.Authenticated,
		);
		expect(events).toEqual([["ready", []]]);
	});

	// Platforms repeat their state — Baileys reports `connection: "open"` again
	// on every reconnect — and a second `ready` would defeat `@Once`.
	it("stays silent when the status has not changed", () => {
		const events = deriveConnectionEvents(
			{ status: ClientStatus.Ready },
			ClientStatus.Ready,
		);
		expect(events).toEqual([]);
	});

	it("emits on the first update, when there is no previous status", () => {
		const events = deriveConnectionEvents(
			{ status: ClientStatus.Ready },
			undefined,
		);
		expect(names(events)).toEqual(["ready"]);
	});

	it("emits authenticated and disconnected on their transitions", () => {
		expect(
			names(
				deriveConnectionEvents(
					{ status: ClientStatus.Authenticated },
					ClientStatus.Initializing,
				),
			),
		).toEqual(["authenticated"]);
		expect(
			names(
				deriveConnectionEvents(
					{ status: ClientStatus.Disconnected },
					ClientStatus.Ready,
				),
			),
		).toEqual(["disconnected"]);
	});

	it("carries the reason on disconnected, and only there", () => {
		const reason = { kind: DisconnectKind.LoggedOut };
		expect(
			deriveConnectionEvents(
				{ status: ClientStatus.Disconnected, reason },
				ClientStatus.Ready,
			),
		).toEqual([["disconnected", [reason]]]);
	});

	it("has no event of its own for Initializing or QrReceived", () => {
		expect(
			names(
				deriveConnectionEvents(
					{ status: ClientStatus.Initializing },
					undefined,
				),
			),
		).toEqual([]);
		expect(
			names(
				deriveConnectionEvents(
					{ status: ClientStatus.QrReceived },
					ClientStatus.Initializing,
				),
			),
		).toEqual([]);
	});

	// A fresh QR is a new value each time, so it is not a transition: the same
	// status with a new payload still has to reach handlers.
	it("emits qr whenever one is present, transition or not", () => {
		const events = deriveConnectionEvents(
			{ status: ClientStatus.QrReceived, qr: "second" },
			ClientStatus.QrReceived,
		);
		expect(events).toEqual([["qr", ["second"]]]);
	});

	it("emits pairingCode the same way", () => {
		const events = deriveConnectionEvents(
			{ status: ClientStatus.PairingCodeReceived, pairingCode: "12345678" },
			ClientStatus.PairingCodeReceived,
		);
		expect(events).toEqual([["pairingCode", ["12345678"]]]);
	});

	it("emits the credential event before the status one", () => {
		const events = deriveConnectionEvents(
			{ status: ClientStatus.QrReceived, qr: "first" },
			ClientStatus.Initializing,
		);
		expect(names(events)).toEqual(["qr"]);
	});

	it("emits both a qr and a status change in one update", () => {
		const events = deriveConnectionEvents(
			{ status: ClientStatus.Disconnected, qr: "stale" },
			ClientStatus.Ready,
		);
		expect(names(events)).toEqual(["qr", "disconnected"]);
	});

	it("ignores an empty qr string", () => {
		expect(
			deriveConnectionEvents(
				{ status: ClientStatus.QrReceived, qr: "" },
				ClientStatus.QrReceived,
			),
		).toEqual([]);
	});
});

describe("isTerminalDisconnect", () => {
	// Terminal means one specific thing: only authenticating again can help.
	it.each([
		DisconnectKind.LoggedOut,
		DisconnectKind.AuthFailure,
	])("is true for %s", (kind) => {
		expect(isTerminalDisconnect({ kind })).toBe(true);
	});

	it.each([
		DisconnectKind.ConnectionLost,
		DisconnectKind.RestartRequired,
		DisconnectKind.Conflict,
		DisconnectKind.Unknown,
	])("is false for %s", (kind) => {
		expect(isTerminalDisconnect({ kind })).toBe(false);
	});

	// Forbidden is the one that reads terminal and is not: a refusal can be a
	// temporary block, so the policy retries it behind a long cooldown rather
	// than giving up. Asserted here so the distinction cannot be lost.
	it("is false for Forbidden, which the policy retries on a cooldown", () => {
		expect(isTerminalDisconnect({ kind: DisconnectKind.Forbidden })).toBe(
			false,
		);
	});

	it("is false when there is no reason at all", () => {
		expect(isTerminalDisconnect(undefined)).toBe(false);
	});
});
