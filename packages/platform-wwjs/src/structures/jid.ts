import { bareId, buildJid, JidKind, parseJid } from "nestwhats";

/**
 * whatsapp-web.js server suffixes <-> NestWhats kinds. Ids cross this boundary
 * normalised, so an id stored by an app keeps working if the platform changes.
 */
const SERVER_TO_KIND: ReadonlyMap<string, JidKind> = new Map([
	["c.us", JidKind.User],
	["s.whatsapp.net", JidKind.User],
	["g.us", JidKind.Group],
	["lid", JidKind.Lid],
	["broadcast", JidKind.Broadcast],
	["newsletter", JidKind.Newsletter],
]);

const KIND_TO_SERVER: ReadonlyMap<JidKind, string> = new Map([
	[JidKind.User, "c.us"],
	[JidKind.Group, "g.us"],
	[JidKind.Lid, "lid"],
	[JidKind.Broadcast, "broadcast"],
	[JidKind.Newsletter, "newsletter"],
]);

/**
 * `5511999@c.us` -> `5511999@user`, dropping the `:device` part so the same
 * contact is one id. An unrecognised suffix is returned untouched rather than
 * mangled.
 */
export function toCanonicalJid(nativeId: string): string {
	const at = nativeId.lastIndexOf("@");
	if (at <= 0) return nativeId;
	const kind = SERVER_TO_KIND.get(nativeId.slice(at + 1));
	return kind ? buildJid(bareId(nativeId), kind) : nativeId;
}

/**
 * `5511999@user` -> `5511999@c.us`.
 * Anything that is not a canonical id passes through, so a native id handed
 * straight to `sendMessage` still works.
 */
export function toNativeJid(canonicalId: string): string {
	const parsed = parseJid(canonicalId);
	if (!parsed) return canonicalId;
	const server = KIND_TO_SERVER.get(parsed.kind);
	return server ? `${parsed.user}@${server}` : canonicalId;
}
