import { Injectable, PipeTransform, Type } from "@nestjs/common";
import {
	ARG_INDEX_METADATA,
	type ArgIndexMeta,
} from "../decorators/arg-index.decorator.js";
import { CommandArgsException } from "../exceptions/command-args.exception.js";

/**
 * Maps the command's words onto a DTO by `@ArgIndex()` and validates it with
 * class-validator, throwing {@link CommandArgsException} when it does not pass.
 *
 * class-transformer and class-validator are imported on first use, so an
 * application that never validates arguments does not need them installed.
 */
@Injectable()
export class ParseArgsPipe<T extends object>
	implements PipeTransform<string[], Promise<T>>
{
	public constructor(private readonly dto: Type<T>) {}

	public async transform(args: string[]): Promise<T> {
		const { plainToInstance } = await import("class-transformer");
		const { validate } = await import("class-validator");

		const metas: ArgIndexMeta[] =
			Reflect.getMetadata(ARG_INDEX_METADATA, this.dto.prototype) ?? [];

		const plain: Record<string, unknown> = {};

		for (const { propertyKey, index, options } of metas) {
			if (options?.rest) {
				const joined = args.slice(index).join(" ");
				plain[propertyKey] = joined.length ? joined : undefined;
			} else {
				plain[propertyKey] = args[index];
			}
		}

		const instance = plainToInstance(this.dto, plain);
		const errors = await validate(instance as object);

		if (errors.length > 0) {
			throw new CommandArgsException(errors);
		}

		return instance;
	}
}
