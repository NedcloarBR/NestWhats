import { Reflector } from "@nestjs/core";
import { ListenerDiscovery, ListenerMeta } from "../listener.discovery";

export const Listener = Reflector.createDecorator<
	ListenerMeta,
	ListenerDiscovery
>({
	transform: (options) => new ListenerDiscovery(options),
});
