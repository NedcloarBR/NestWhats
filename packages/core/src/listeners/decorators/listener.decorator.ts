import { Reflector } from "@nestjs/core";
import { ListenerDiscovery, ListenerMeta } from "../listener.discovery.js";

/**
 * Declares an event listener. {@link On} and {@link Once} are the forms to use;
 * this is what platform packages build their own decorators on.
 */
export const Listener = Reflector.createDecorator<
	ListenerMeta,
	ListenerDiscovery
>({
	transform: (options) => new ListenerDiscovery(options),
});
