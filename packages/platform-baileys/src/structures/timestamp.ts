/**
 * Baileys stamps timestamps in seconds, as a number or a protobuf `Long`
 * depending on the path the value took. The `Long` dependency is not taken on
 * for one method call; the shape is enough.
 */
export function toMillis(
	timestamp: number | { toNumber(): number } | null | undefined,
): number {
	if (timestamp === null || timestamp === undefined) return 0;
	const seconds =
		typeof timestamp === "number" ? timestamp : timestamp.toNumber();
	return seconds * 1000;
}
