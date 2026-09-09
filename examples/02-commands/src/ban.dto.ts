import { ArgIndex } from "nestwhats";

/**
 * Positional arguments, filled by the `ParseArgs` pipe.
 *
 * `rest: true` collects everything from that position onwards, so a reason
 * with spaces arrives whole instead of only its first word.
 */
export class BanDto {
	@ArgIndex(0)
	public user!: string;

	@ArgIndex(1, { rest: true })
	public reason!: string;
}
