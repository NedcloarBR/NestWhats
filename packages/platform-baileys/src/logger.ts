import { Logger } from "@nestjs/common";
import type { BaileysLogger } from "./structures/socket-handle.js";

/** pino's levels, which is what Baileys' logger contract is modelled on. */
export type BaileysLogLevel =
	| "trace"
	| "debug"
	| "info"
	| "warn"
	| "error"
	| "fatal"
	| "silent";

const ORDER: readonly BaileysLogLevel[] = [
	"trace",
	"debug",
	"info",
	"warn",
	"error",
	"fatal",
	"silent",
];

function isEnabled(
	level: BaileysLogLevel,
	threshold: BaileysLogLevel,
): boolean {
	return ORDER.indexOf(level) >= ORDER.indexOf(threshold);
}

/** pino takes an object first and the message second; Nest takes one line. */
function format(obj: unknown, msg?: string): string {
	const text = msg ?? "";
	if (!obj || typeof obj !== "object" || Object.keys(obj).length === 0) {
		return text || String(obj ?? "");
	}
	let extra: string;
	try {
		extra = JSON.stringify(obj);
	} catch {
		extra = "[unserializable]";
	}
	return text ? `${text} ${extra}` : extra;
}

/**
 * Routes Baileys' logging into Nest's `Logger`, so a socket's output lands in
 * the same place as everything else in the application, filtered by the
 * level the adapter was given.
 *
 * Baileys needs a pino-shaped logger — `child()`, `level`, and an
 * object-first signature — and its own dependency on pino is not one this
 * package takes on. Pass a real pino instance through the `logger` option to
 * bypass this entirely.
 */
export function createNestBaileysLogger(
	threshold: BaileysLogLevel,
	context: string,
): BaileysLogger {
	const nest = new Logger(context);
	const make = (level: BaileysLogLevel): BaileysLogger => ({
		level,
		child: () => make(level),
		trace: (obj, msg) => {
			if (isEnabled("trace", level)) nest.verbose(format(obj, msg));
		},
		debug: (obj, msg) => {
			if (isEnabled("debug", level)) nest.debug(format(obj, msg));
		},
		info: (obj, msg) => {
			if (isEnabled("info", level)) nest.log(format(obj, msg));
		},
		warn: (obj, msg) => {
			if (isEnabled("warn", level)) nest.warn(format(obj, msg));
		},
		error: (obj, msg) => {
			if (isEnabled("error", level)) nest.error(format(obj, msg));
		},
	});
	return make(threshold);
}
