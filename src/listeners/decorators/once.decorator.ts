import { NestWhatsEvents } from "../listener.interface";
import { Listener } from "./listener.decorator";

export const Once = <K extends keyof E, E = NestWhatsEvents>(
	event: K,
	options?: { client?: string | string[] },
) => Listener({ type: "once", event, client: options?.client });
