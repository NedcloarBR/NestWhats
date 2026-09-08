import { ExceptionFilter } from "@nestjs/common";

/**
 * Exception filter for the `nestwhats` context. Implement it and apply with
 * `@UseFilters()` to handle errors thrown by a command or listener.
 */
export interface NestWhatsExceptionFilter<T = any> extends ExceptionFilter<T> {}
