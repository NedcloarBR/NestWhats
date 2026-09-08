import { NestWhatsParamType } from "../paramtype.enum.js";
import { createNestWhatsParamDecorator } from "./params.util.js";

/**
 * The handler's own discovery object — its declared metadata, class and method.
 * Useful for a handler that reports on itself, such as a help command.
 */
export const Discovery = createNestWhatsParamDecorator(
	NestWhatsParamType.DISCOVERY,
);
