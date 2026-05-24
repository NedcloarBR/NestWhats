import { Message } from "whatsapp-web.js";
import { NestWhatsEvents } from "../listeners/listener.interface";

export type CommandContext = [Message];

export type ContextOf<K extends keyof E, E = NestWhatsEvents> = E[K];
