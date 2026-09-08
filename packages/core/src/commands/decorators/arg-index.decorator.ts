/**
 * Reflect metadata key for the argument index.
 *
 * Registry-backed on purpose: a plain `Symbol()` is created once per evaluated
 * copy of this module, so a decorator applied through one copy would write
 * metadata that another copy cannot read. `Symbol.for` resolves by key, which
 * survives a consumer that ends up with two copies of the package.
 */
export const ARG_INDEX_METADATA = Symbol.for("NESTWHATS::ARG_INDEX_METADATA");

/** How {@link ArgIndex} reads a position. */
export interface ArgIndexOptions {
	/** Take every remaining word, not just the one at this index. */
	rest?: boolean;
}

/** One `@ArgIndex()` declaration, as {@link ParseArgsPipe} reads it back. */
export interface ArgIndexMeta {
	propertyKey: string;
	index: number;
	options?: ArgIndexOptions;
}

/**
 * Binds a DTO property to a position in the command's words, for
 * {@link ParseArgsPipe}.
 *
 * ```typescript
 * class BanDto {
 *   @ArgIndex(0) target: string;
 *   @ArgIndex(1, { rest: true }) reason: string;
 * }
 * ```
 */
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
