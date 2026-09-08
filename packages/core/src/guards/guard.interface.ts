import { CanActivate } from "@nestjs/common";

/**
 * Guard for the `nestwhats` context. Implement it and apply with `@UseGuards()`
 * to decide whether a command or listener runs.
 */
export interface NestWhatsGuard extends CanActivate {}
