import type { Message } from "whatsapp-web.js";
import WWebJs from "whatsapp-web.js";

/**
 * Runtime values from whatsapp-web.js.
 *
 * The package is CommonJS, and Node's named-export detection only finds part of
 * it from an ES module: `Client` comes through, while `Events`, `LocalAuth`,
 * `MessageMedia`, `MessageTypes` and `WAState` all arrive `undefined` — a
 * failure that appears only at runtime, and only once something reads them.
 * Destructuring the default export gets the real objects, so every runtime use
 * in this package goes through this file.
 *
 * Types still come straight from the package: a use site that needs both takes
 * the value from here and the type from `whatsapp-web.js`, aliased.
 */
export const {
	Client,
	Events,
	LocalAuth,
	MessageMedia,
	MessageTypes,
	WAState,
} = WWebJs;

/**
 * whatsapp-web.js exports `Message` as a class at runtime but declares it as an
 * `interface`, so the constructor is only reachable through the module object.
 */
export const NativeMessage = (
	WWebJs as unknown as {
		Message?: new (...args: never[]) => Message;
	}
).Message;
