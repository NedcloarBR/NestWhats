import { SetMetadata } from "@nestjs/common";

/** Class metadata key holding a {@link CommandGroupMeta}. */
export const COMMAND_GROUP_KEY = "NESTWHATS::COMMAND_GROUP";

/** What `@CommandGroup()` takes. */
export interface CommandGroupMeta {
	/** The parent word, as in `!config` for `!config prefix`. */
	name: string;
	/** Shown by a help command. */
	description: string;
	/** Restricts the whole group to one or more named clients. */
	client?: string | string[];
}

/**
 * Declares a class as a group of subcommands, so its `@Subcommand()` handlers
 * are reached as `!parent child`.
 */
export const CommandGroup = (meta: CommandGroupMeta) =>
	SetMetadata(COMMAND_GROUP_KEY, meta);
