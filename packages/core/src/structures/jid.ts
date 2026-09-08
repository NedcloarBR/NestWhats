/**
 * What a WhatsApp id points at. Platforms spell the same thing differently —
 * whatsapp-web.js says `5511999@c.us`, Baileys says `5511999@s.whatsapp.net` —
 * so adapters normalise to this vocabulary at their boundary and NestWhats ids
 * stay stable when you swap the platform underneath.
 */
export enum JidKind {
	User = "user",
	Group = "group",
	/** Linked id: WhatsApp's privacy-preserving address, hides the phone number. */
	Lid = "lid",
	Broadcast = "broadcast",
	Newsletter = "newsletter",
}

/** A canonical id split into its parts. */
export interface ParsedJid {
	/** The address itself, without the suffix. */
	user: string;
	kind: JidKind;
}

const KINDS = new Set<string>(Object.values(JidKind));

/**
 * The address without its suffix and without the device part.
 *
 * WhatsApp addresses a specific linked device as `user:device@server`, and the
 * same contact reaches you with and without it depending on the event. Keeping
 * it would make two ids for one person, so comparисons — `IsAdminGuard` matching
 * a sender against group participants, for one — would silently fail.
 */
export function bareId(jid: string): string {
	const at = jid.lastIndexOf("@");
	const local = at > 0 ? jid.slice(0, at) : jid;
	const colon = local.indexOf(":");
	return colon > 0 ? local.slice(0, colon) : local;
}

/** `5511999`, `user` -> `5511999@user` */
export function buildJid(user: string, kind: JidKind): string {
	return `${user}@${kind}`;
}

/**
 * Splits a canonical NestWhats id. Returns undefined for anything that is not
 * one — an un-normalised platform id included, so callers can tell them apart.
 */
export function parseJid(jid: string): ParsedJid | undefined {
	const at = jid.lastIndexOf("@");
	if (at <= 0) return undefined;
	const kind = jid.slice(at + 1);
	if (!KINDS.has(kind)) return undefined;
	return { user: jid.slice(0, at), kind: kind as JidKind };
}

/**
 * Whether an id belongs to a group.
 *
 * Reading the id is how scope guards decide, since it works on platforms that
 * cannot fetch a chat and costs no round trip on the ones that can.
 */
export function isGroupJid(jid: string): boolean {
	return parseJid(jid)?.kind === JidKind.Group;
}
