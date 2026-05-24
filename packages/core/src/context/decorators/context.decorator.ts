import { NestWhatsParamType } from "../nestwhats-paramtype.enum";
import { createNestWhatsParamDecorator } from "./params.util";

export const Context = createNestWhatsParamDecorator(
	NestWhatsParamType.CONTEXT,
);

export const Ctx = Context;
