import { NestWhatsEvents } from "../listener.interface";
import { Listener } from "./listener.decorator";

export const Once = <K extends keyof E, E = NestWhatsEvents>(event: K) =>
	Listener({ type: "once", event });
