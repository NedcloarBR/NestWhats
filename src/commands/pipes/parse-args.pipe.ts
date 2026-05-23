import { Injectable, PipeTransform, Type } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
	ARG_INDEX_METADATA,
	type ArgIndexMeta,
} from "../decorators/arg-index.decorator";
import { CommandArgsException } from "../exceptions/command-args.exception";

@Injectable()
export class ParseArgsPipe<T extends object>
	implements PipeTransform<string[], Promise<T>>
{
	public constructor(private readonly dto: Type<T>) {}

	public async transform(args: string[]): Promise<T> {
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
