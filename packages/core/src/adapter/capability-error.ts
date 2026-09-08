import type { AdapterCapability } from "./adapter-capability.js";

/**
 * Base for every error NestWhats raises itself.
 *
 * Catching this separates "the library refused" from "the platform failed",
 * which a bare `Error` cannot express — and matching on message text is how
 * that goes wrong.
 */
export class NestWhatsError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = new.target.name;
	}
}

/**
 * A capability was used on a platform that does not have it.
 *
 * The fields are the point: portable code branches on `capability` instead of
 * parsing the message, and `platform` says which adapter refused when several
 * clients are in play.
 *
 * ```typescript
 * try {
 *   await client.postStatus('good morning');
 * } catch (err) {
 *   if (err instanceof CapabilityNotSupportedError) {
 *     this.logger.warn(`${err.platform ?? err.client} cannot ${err.capability}`);
 *     return;
 *   }
 *   throw err;
 * }
 * ```
 */
export class CapabilityNotSupportedError extends NestWhatsError {
	public constructor(
		/** The capability that was asked for. */
		public readonly capability: AdapterCapability,
		/** Which client refused; the default one when it was not named. */
		public readonly client: string,
		/** Id of the platform behind it, when the adapter declares one. */
		public readonly platform?: string,
	) {
		super(
			`[NestWhats] The adapter of client "${client}" does not support ${capability}`,
		);
	}
}
