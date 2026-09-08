import type { DisconnectReason } from "./disconnect-reason.js";
import {
	ReconnectPolicy,
	type ReconnectPolicyOptions,
} from "./reconnect-policy.js";

/** What {@link ReconnectRunner} needs from the client it is reviving. */
export interface ReconnectRunnerHooks {
	/** How to bring the client back — normally `adapter.initialize()`. */
	reconnect(): Promise<void>;
	/** False when the client recovered on its own while the timer was pending. */
	isStillDown(): boolean;
	onAttempt?(attempt: number, delayMs: number): void;
	onGiveUp?(reason: string): void;
	onError?(err: unknown, attempt: number): void;
}

/**
 * Runs a `ReconnectPolicy` against a real client: one timer at a time, and
 * nothing fired for a client that came back while the timer was pending.
 *
 * Opt-in, because platforms differ on who owns reconnection. Libraries that
 * reconnect internally should keep doing it and leave this off; the ones that
 * simply stop — whatsapp-web.js among them — need someone to call `initialize`
 * again, and that is this.
 */
export class ReconnectRunner {
	private readonly policy: ReconnectPolicy;
	private timer?: NodeJS.Timeout;

	public constructor(
		private readonly hooks: ReconnectRunnerHooks,
		options: ReconnectPolicyOptions = {},
	) {
		this.policy = new ReconnectPolicy(options);
	}

	/** Call on every drop. */
	public schedule(reason?: DisconnectReason): void {
		if (this.timer) return;

		const decision = this.policy.next(reason);
		if (!decision.retry) {
			this.hooks.onGiveUp?.(decision.reason ?? "no retry");
			return;
		}

		const attempt = this.policy.attempt;
		this.hooks.onAttempt?.(attempt, decision.delayMs);
		this.timer = setTimeout(() => {
			this.timer = undefined;
			if (!this.hooks.isStillDown()) return;
			this.hooks
				.reconnect()
				.catch((err: unknown) => this.hooks.onError?.(err, attempt));
		}, decision.delayMs);
		this.timer.unref?.();
	}

	/** Call when the client is up: cancels a pending attempt and clears the backoff. */
	public succeeded(): void {
		this.cancel();
		this.policy.reset();
	}

	public cancel(): void {
		if (!this.timer) return;
		clearTimeout(this.timer);
		this.timer = undefined;
	}
}
