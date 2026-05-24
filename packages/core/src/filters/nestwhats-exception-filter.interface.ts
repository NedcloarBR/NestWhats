import { ExceptionFilter } from "@nestjs/common";

export interface NestWhatsExceptionFilter<T = any> extends ExceptionFilter<T> {}
