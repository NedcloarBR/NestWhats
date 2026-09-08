import { NESTWHATS_ADAPTER_EVENTS } from "nestwhats";
import { Events } from "../runtime.js";

/** `message_revoke_everyone` -> `messageRevokeEveryone` */
function toCamelCase(nativeEvent: string): string {
	return nativeEvent.replace(/_([a-z])/g, (_, char: string) =>
		char.toUpperCase(),
	);
}

/**
 * Native event name -> NestWhats event name, derived from the whatsapp-web.js
 * `Events` enum. Nothing is listed by hand, so an event added upstream starts
 * being forwarded as soon as the dependency is bumped.
 */
export const NATIVE_TO_NESTWHATS: ReadonlyMap<string, string> = new Map(
	Object.values(Events).map((nativeEvent) => [
		nativeEvent,
		toCamelCase(nativeEvent),
	]),
);

/**
 * The NestWhats contract plus every native event, in NestWhats spelling.
 *
 * `messageStatus` is listed explicitly: it is a portable event this adapter
 * derives from the native `message_ack`, so it is not in either source.
 */
export const SUPPORTED_EVENTS: ReadonlySet<string> = new Set<string>([
	...NESTWHATS_ADAPTER_EVENTS,
	"messageStatus",
	...NATIVE_TO_NESTWHATS.values(),
]);
