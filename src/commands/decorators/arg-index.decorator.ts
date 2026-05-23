export const ARG_INDEX_METADATA = Symbol("NESTWHATS::ARG_INDEX_METADATA");

export interface ArgIndexOptions {
	rest?: boolean;
}

export interface ArgIndexMeta {
	propertyKey: string;
	index: number;
	options?: ArgIndexOptions;
}

export function ArgIndex(
	index: number,
	options?: ArgIndexOptions,
): PropertyDecorator {
	return (target, propertyKey) => {
		const existing: ArgIndexMeta[] =
			Reflect.getMetadata(ARG_INDEX_METADATA, target) ?? [];
		Reflect.defineMetadata(
			ARG_INDEX_METADATA,
			[...existing, { propertyKey: String(propertyKey), index, options }],
			target,
		);
	};
}
