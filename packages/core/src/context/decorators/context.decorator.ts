import { NestWhatsParamType } from "../paramtype.enum.js";
import { createNestWhatsParamDecorator } from "./params.util.js";

/**
 * The event's arguments as a tuple, starting with the client.
 *
 * ```typescript
 * @On('ready')
 * onReady(@Context() [client]: ContextOf<'ready'>) {}
 * ```
 */
export const Context = createNestWhatsParamDecorator(
	NestWhatsParamType.CONTEXT,
);

/** Short form of {@link Context}. */
export const Ctx = Context;
