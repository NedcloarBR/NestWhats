import type { ValidationError } from "class-validator";

/**
 * Thrown by {@link ParseArgsPipe} when the words do not satisfy the DTO.
 *
 * The message joins every constraint that failed; `errors` keeps the raw
 * class-validator errors for a filter that wants to format them itself.
 */
export class CommandArgsException extends Error {
	public readonly errors: ValidationError[];

	public constructor(errors: ValidationError[]) {
		const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
		super(messages.join("; "));
		this.name = "CommandArgsException";
		this.errors = errors;
	}
}
