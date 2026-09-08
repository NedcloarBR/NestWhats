import { assignMetadata, PipeTransform, Type } from "@nestjs/common";
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { NestWhatsParamType } from "../paramtype.enum.js";

/** Builds a NestWhats parameter decorator for one {@link NestWhatsParamType}. */
export function createNestWhatsParamDecorator(type: NestWhatsParamType) {
	return (
		...pipes: (Type<PipeTransform> | PipeTransform)[]
	): ParameterDecorator =>
		(target, key, index) => {
			// `key` is undefined for a constructor parameter; these decorators
			// annotate handler parameters, and there is nothing to record otherwise.
			if (key === undefined) return;
			const args =
				Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, key) || {};

			Reflect.defineMetadata(
				ROUTE_ARGS_METADATA,
				assignMetadata(args, type, index, undefined, ...pipes),
				target.constructor,
				key,
			);
		};
}
