import { DisconnectKind, type DisconnectReason } from "./disconnect-reason.js";

/** Tuning for {@link ReconnectPolicy}; every field has a sensible default. */
export interface ReconnectPolicyOptions {
	/** First retry delay; doubles from there. Defaults to 1000. */
	baseDelayMs?: number;
	/** Ceiling for the exponential growth. Defaults to 60000. */
	maxDelayMs?: number;
	/** Give up after this many consecutive attempts. Defaults to unlimited. */
	maxAttempts?: number;
	/**
	 * How long to wait when the platform is refusing the account. Retrying at
	 * the usual pace only deepens the block, so this is a flat, long delay.
	 * Defaults to 300000 (5 min).
	 */
	forbiddenCooldownMs?: number;
	/**
	 * Random share added to each delay, 0–1. Spreads the retries of several
	 * clients that dropped together instead of reconnecting them in lockstep.
	 * Defaults to 0.2.
	 */
	jitter?: number;
}

/** Whether to try again, and when. */
export interface ReconnectDecision {
	retry: boolean;
	/** How long to wait before trying, in ms. Meaningless when `retry` is false. */
	delayMs: number;
	/** Why not, when `retry` is false — worth logging. */
	reason?: string;
}

const DEFAULTS = {
	baseDelayMs: 1_000,
	maxDelayMs: 60_000,
	maxAttempts: Number.POSITIVE_INFINITY,
	forbiddenCooldownMs: 300_000,
	jitter: 0.2,
} satisfies Required<ReconnectPolicyOptions>;

/**
 * Decides whether — and when — to reconnect after a drop.
 *
 * The decision comes from the `DisconnectKind` the adapter reported, not from
 * an attempt counter alone: reconnecting after a logout can never work, an
 * expected restart should come back at once, and a refused account needs to be
 * left alone for a while. Everything else backs off exponentially.
 *
 * The policy holds only the attempt counter, so one instance belongs to one
 * client. Call `reset()` once the client is up again.
 */
export class ReconnectPolicy {
	private attempts = 0;
	private readonly options: Required<ReconnectPolicyOptions>;

	public constructor(options: ReconnectPolicyOptions = {}) {
		this.options = { ...DEFAULTS, ...options };
	}

	public get attempt(): number {
		return this.attempts;
	}

	public next(reason?: DisconnectReason): ReconnectDecision {
		switch (reason?.kind) {
			case DisconnectKind.LoggedOut:
				return {
					retry: false,
					delayMs: 0,
					reason: "the session was logged out — authenticate again",
				};
			case DisconnectKind.AuthFailure:
				return {
					retry: false,
					delayMs: 0,
					reason: "the credentials were rejected — authenticate again",
				};
			default:
				break;
		}

		this.attempts++;
		if (this.attempts > this.options.maxAttempts) {
			return {
				retry: false,
				delayMs: 0,
				reason: `gave up after ${this.options.maxAttempts} attempt(s)`,
			};
		}

		if (reason?.kind === DisconnectKind.Forbidden) {
			return {
				retry: true,
				delayMs: this.withJitter(this.options.forbiddenCooldownMs),
			};
		}

		// An expected restart is not a failure: the platform asked for it, so it
		// does not consume the backoff curve.
		if (reason?.kind === DisconnectKind.RestartRequired) {
			return {
				retry: true,
				delayMs: this.withJitter(this.options.baseDelayMs),
			};
		}

		const backoff = Math.min(
			this.options.baseDelayMs * 2 ** (this.attempts - 1),
			this.options.maxDelayMs,
		);
		return { retry: true, delayMs: this.withJitter(backoff) };
	}

	/** Call when the client is back up, so the next drop starts from the base delay. */
	public reset(): void {
		this.attempts = 0;
	}

	private withJitter(delayMs: number): number {
		return Math.round(delayMs * (1 + Math.random() * this.options.jitter));
	}
}
