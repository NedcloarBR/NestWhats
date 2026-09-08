import { Inject } from "@nestjs/common";
import {
	getClientToken,
	trackRequestedClient,
} from "../../client/client-token.util.js";
import { NESTWHATS_DEFAULT_NAME } from "../../module/module-options.interface.js";

/**
 * Injects a named client.
 *
 * ```typescript
 * constructor(@InjectClient('personal') private readonly client: NestWhatsClient) {}
 * ```
 *
 * A name that is not declared in `forRoot` fails at startup, naming the clients
 * that do exist.
 */
export const InjectClient = (name?: string) => {
	const resolved = name ?? NESTWHATS_DEFAULT_NAME;
	trackRequestedClient(resolved);
	return Inject(getClientToken(resolved));
};
