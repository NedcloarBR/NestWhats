import { Reflector } from "@nestjs/core";
import type { SubcommandMeta } from "../subcommand.discovery.js";

/**
 * Declares a subcommand inside a `@CommandGroup()` class, reached as
 * `!parent name`.
 */
export const Subcommand = Reflector.createDecorator<SubcommandMeta>();
