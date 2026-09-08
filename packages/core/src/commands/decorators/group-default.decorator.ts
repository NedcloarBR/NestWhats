import { Reflector } from "@nestjs/core";

/**
 * Marks the handler that runs when a group is invoked with no subcommand — the
 * answer to a bare `!config`.
 */
export const GroupDefault = Reflector.createDecorator<void>();
