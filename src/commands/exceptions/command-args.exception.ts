import type { ValidationError } from "class-validator";

export class CommandArgsException extends Error {
	public readonly errors: ValidationError[];

	public constructor(errors: ValidationError[]) {
		const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
		super(messages.join("; "));
		this.name = "CommandArgsException";
		this.errors = errors;
	}
}
