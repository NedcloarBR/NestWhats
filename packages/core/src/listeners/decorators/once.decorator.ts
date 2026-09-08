import { NestWhatsEvents } from "../listener.interface.js";
import { Listener } from "./listener.decorator.js";

/** Like {@link On}, but the handler runs for the first occurrence only. */
export const Once = <K extends keyof E, E = NestWhatsEvents>(
	event: K,
	options?: { client?: string | string[] },
) => Listener({ type: "once", event, client: options?.client });
