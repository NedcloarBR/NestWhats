import { createParamDecorator } from "@nestjs/common";
import { LocaleStorage } from "../locale.context";
import type { TranslationFn } from "../interfaces/nestwhats-locale-options.interface";

export const CurrentTranslate = createParamDecorator(
	(): TranslationFn => LocaleStorage.getStore() ?? ((key: string) => key),
);
