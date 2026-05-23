import { InjectionToken } from "@nestjs/common";

export const DEFAULT_CLIENT_NAME = Symbol("NESTWHATS::DEFAULT_CLIENT::TOKEN");

export const getClientToken = (
	name: InjectionToken = DEFAULT_CLIENT_NAME,
): InjectionToken =>
	Symbol.for(`NESTWHATS::${name.toString().toUpperCase()}_CLIENT::TOKEN`);
