import { Inject, InjectionToken } from "@nestjs/common";
import { getClientToken } from "../../providers/client-token.util";

export const InjectClient = (name?: InjectionToken) =>
	Inject(getClientToken(name));
