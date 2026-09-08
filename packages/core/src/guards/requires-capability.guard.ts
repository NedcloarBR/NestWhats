import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
	Logger,
	mixin,
	type Type,
} from "@nestjs/common";
import type { AdapterCapability } from "../adapter/index.js";
import { CommandContext, NestWhatsExecutionContext } from "../context/index.js";
import type { NestWhatsGuard } from "./guard.interface.js";

const cache = new Map<string, Type<NestWhatsGuard>>();

/**
 * Allows the handler only on a client whose adapter has every capability listed.
 *
 * Without it, a handler that calls something the platform lacks fails halfway
 * through — after it has already replied, or set a typing indicator. This turns
 * that into a decision made before the handler runs, which is the difference
 * between a bot that stays quiet on a platform and one that answers with an
 * error.
 *
 * ```typescript
 * @Command({ name: 'story' })
 * @UseGuards(RequiresCapability(AdapterCapability.PostStatus))
 * public async onStory(@Message() message: NestWhatsMessage) {
 *   // reached only where postStatus exists
 * }
 * ```
 *
 * It denies rather than throws, so the handler is skipped like any other guard
 * refusal. The reason is logged once per handler — silence would look like the
 * command was never registered.
 *
 * @param capabilities - all of them must be supported; an empty list allows.
 */
export function RequiresCapability(
	...capabilities: AdapterCapability[]
): Type<NestWhatsGuard> {
	const key = [...capabilities].sort().join(",");
	const cached = cache.get(key);
	if (cached) return cached;

	@Injectable()
	class RequiresCapabilityGuard implements CanActivate {
		private readonly logger = new Logger("RequiresCapability");
		private readonly warned = new Set<string>();

		public async canActivate(rawCtx: ExecutionContext): Promise<boolean> {
			const ctx = NestWhatsExecutionContext.create(rawCtx);
			const [client] = ctx.getContext<CommandContext>();
			if (!client) return false;

			const missing = capabilities.filter(
				(capability) => !client.supports(capability),
			);
			if (!missing.length) return true;

			// Once per client per handler: a bot with a busy chat would otherwise
			// log the same refusal on every message.
			const handler = `${rawCtx.getClass().name}.${rawCtx.getHandler().name}`;
			const seen = `${client.name}:${handler}`;
			if (!this.warned.has(seen)) {
				this.warned.add(seen);
				this.logger.warn(
					`[${client.name}] "${handler}" is skipped on this client: its adapter does not support ${missing.join(", ")}`,
				);
			}
			return false;
		}
	}

	const guard = mixin(RequiresCapabilityGuard);
	cache.set(key, guard);
	return guard;
}
