import { AsyncLocalStorage } from "node:async_hooks";
import type { TranslationFn } from "./interfaces/nestwhats-locale-options.interface";

export const LocaleStorage = new AsyncLocalStorage<TranslationFn>();
