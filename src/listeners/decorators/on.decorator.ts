import { NestWhatsEvents } from "../listener.interface";
import { Listener } from "./listener.decorator";

export const On = <K extends keyof E, E = NestWhatsEvents>(
	event: K,
	options?: { client?: string | string[] },
) => Listener({ type: "on", event, client: options?.client });
