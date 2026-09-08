import { afterEach, describe, expect, it, vi } from "vitest";
import { DisconnectKind } from "../src/adapter/disconnect-reason.js";
import { ReconnectPolicy } from "../src/adapter/reconnect-policy.js";

/** Jitter is random by design, so pin it to its floor to assert on delays. */
function noJitter(options = {}) {
	return new ReconnectPolicy({ jitter: 0, ...options });
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("giving up", () => {
	// Retrying after either of these can never work: the credentials are gone.
	it.each([
		[DisconnectKind.LoggedOut, /logged out/],
		[DisconnectKind.AuthFailure, /rejected/],
	])("refuses to retry after %s", (kind, message) => {
		const decision = noJitter().next({ kind });
		expect(decision.retry).toBe(false);
		expect(decision.reason).toMatch(message);
	});

	it("does not consume an attempt when it refuses", () => {
		const policy = noJitter();
		policy.next({ kind: DisconnectKind.LoggedOut });
		policy.next({ kind: DisconnectKind.LoggedOut });
		expect(policy.attempt).toBe(0);
	});

	it("gives up after maxAttempts", () => {
		const policy = noJitter({ maxAttempts: 2 });
		expect(policy.next().retry).toBe(true);
		expect(policy.next().retry).toBe(true);
		const third = policy.next();
		expect(third.retry).toBe(false);
		expect(third.reason).toMatch(/gave up after 2/);
	});

	it("retries forever by default", () => {
		const policy = noJitter();
		for (let i = 0; i < 50; i++) expect(policy.next().retry).toBe(true);
	});
});

describe("backoff", () => {
	it("doubles from the base delay", () => {
		const policy = noJitter({ baseDelayMs: 1_000 });
		expect(policy.next().delayMs).toBe(1_000);
		expect(policy.next().delayMs).toBe(2_000);
		expect(policy.next().delayMs).toBe(4_000);
		expect(policy.next().delayMs).toBe(8_000);
	});

	it("stops growing at maxDelayMs", () => {
		const policy = noJitter({ baseDelayMs: 1_000, maxDelayMs: 4_000 });
		const delays = [1, 2, 3, 4, 5, 6].map(() => policy.next().delayMs);
		expect(delays).toEqual([1_000, 2_000, 4_000, 4_000, 4_000, 4_000]);
	});

	it("starts over after reset", () => {
		const policy = noJitter({ baseDelayMs: 1_000 });
		policy.next();
		policy.next();
		policy.reset();
		expect(policy.attempt).toBe(0);
		expect(policy.next().delayMs).toBe(1_000);
	});
});

describe("reasons that change the delay", () => {
	// Retrying a refusal at the usual pace only deepens the block.
	it("waits the long cooldown when the account is refused", () => {
		const policy = noJitter({
			baseDelayMs: 1_000,
			forbiddenCooldownMs: 300_000,
		});
		expect(policy.next({ kind: DisconnectKind.Forbidden }).delayMs).toBe(
			300_000,
		);
	});

	// An expected restart is not a failure, so it comes back at the base delay
	// however many have happened before.
	it("uses the base delay for an expected restart", () => {
		const policy = noJitter({ baseDelayMs: 1_000 });
		policy.next();
		policy.next();
		policy.next();
		expect(policy.next({ kind: DisconnectKind.RestartRequired }).delayMs).toBe(
			1_000,
		);
	});

	it("still counts an expected restart towards maxAttempts", () => {
		const policy = noJitter({ maxAttempts: 1 });
		expect(policy.next({ kind: DisconnectKind.RestartRequired }).retry).toBe(
			true,
		);
		expect(policy.next({ kind: DisconnectKind.RestartRequired }).retry).toBe(
			false,
		);
	});

	it.each([
		DisconnectKind.ConnectionLost,
		DisconnectKind.Conflict,
		DisconnectKind.Unknown,
	])("backs off normally after %s", (kind) => {
		const policy = noJitter({ baseDelayMs: 1_000 });
		expect(policy.next({ kind }).delayMs).toBe(1_000);
		expect(policy.next({ kind }).delayMs).toBe(2_000);
	});
});

describe("jitter", () => {
	// Several clients that dropped together must not reconnect in lockstep.
	it("adds up to the configured share", () => {
		vi.spyOn(Math, "random").mockReturnValue(1);
		const policy = new ReconnectPolicy({ baseDelayMs: 1_000, jitter: 0.2 });
		expect(policy.next().delayMs).toBe(1_200);
	});

	it("adds nothing at the bottom of the range", () => {
		vi.spyOn(Math, "random").mockReturnValue(0);
		const policy = new ReconnectPolicy({ baseDelayMs: 1_000, jitter: 0.2 });
		expect(policy.next().delayMs).toBe(1_000);
	});

	it("never shortens a delay", () => {
		const policy = new ReconnectPolicy({ baseDelayMs: 1_000 });
		for (let i = 0; i < 20; i++) {
			expect(
				new ReconnectPolicy({ baseDelayMs: 1_000 }).next().delayMs,
			).toBeGreaterThanOrEqual(1_000);
		}
		expect(policy.next().delayMs).toBeGreaterThanOrEqual(1_000);
	});
});
