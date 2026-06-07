import { Reflector } from "@nestjs/core";
import type { SubcommandMeta } from "../subcommand.discovery";

export const Subcommand = Reflector.createDecorator<SubcommandMeta>();
