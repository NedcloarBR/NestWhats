import { InjectionToken } from "@nestjs/common";

/**
 * The injection token for a named client — what `@InjectClient('personal')`
 * resolves.
 *
 * Registry-backed (`Symbol.for`), so the token stays the same even if a
 * consumer ends up with two copies of this package, where a plain symbol or a
 * class reference would diverge and break injection.
 */
export const getClientToken = (name: string | InjectionToken): InjectionToken =>
	Symbol.for(`NESTWHATS::${name.toString().toUpperCase()}_CLIENT::TOKEN`);

const requestedClientNames = new Set<string>();

/** Internal: records names used with `@InjectClient` so forRoot can diagnose unknown ones. */
export const trackRequestedClient = (name: string): void => {
	requestedClientNames.add(name);
};

/** Internal: names seen by `@InjectClient`, so `forRoot` can name unknown ones. */
export const getRequestedClientNames = (): ReadonlySet<string> =>
	requestedClientNames;
