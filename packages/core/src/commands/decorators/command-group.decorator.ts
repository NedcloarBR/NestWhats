import { SetMetadata } from "@nestjs/common";

export const COMMAND_GROUP_KEY = "NESTWHATS::COMMAND_GROUP";

export interface CommandGroupMeta {
	name: string;
	description: string;
	client?: string | string[];
}

export const CommandGroup = (meta: CommandGroupMeta) =>
	SetMetadata(COMMAND_GROUP_KEY, meta);
