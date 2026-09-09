import { ArgIndex } from "nestwhats";

export class KickDto {
	@ArgIndex(0)
	public user!: string;
}
