import { NestWhatsParamType } from "../nestwhats-paramtype.enum";
import { createNestWhatsParamDecorator } from "./params.util";

export const Discovery = createNestWhatsParamDecorator(
	NestWhatsParamType.DISCOVERY,
);
