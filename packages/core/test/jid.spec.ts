import { describe, expect, it } from "vitest";
import {
	bareId,
	buildJid,
	isGroupJid,
	JidKind,
	parseJid,
} from "../src/structures/jid.js";

describe("bareId", () => {
	it("strips the suffix", () => {
		expect(bareId("5511999@user")).toBe("5511999");
	});

	// The reason this function exists: WhatsApp addresses a specific linked
	// device as `user:device@server`, and the same contact arrives with and
	// without it depending on the event. Keeping the device part would make two
	// ids for one person and break every comparison built on them.
	it("strips the device part", () => {
		expect(bareId("5511999:12@user")).toBe("5511999");
	});

	it("gives one id for the same contact seen both ways", () => {
		expect(bareId("5511999:12@user")).toBe(bareId("5511999@user"));
	});

	it("handles an id with no suffix", () => {
		expect(bareId("5511999")).toBe("5511999");
	});

	it("keeps a leading colon, which is not a device separator", () => {
		expect(bareId(":5511999@user")).toBe(":5511999");
	});

	it("uses the last @, so a suffix inside the local part does not confuse it", () => {
		expect(bareId("a@b@group")).toBe("a@b");
	});
});

describe("parseJid", () => {
	it.each([
		["5511999@user", "5511999", JidKind.User],
		["12345@group", "12345", JidKind.Group],
		["abc@lid", "abc", JidKind.Lid],
		["x@broadcast", "x", JidKind.Broadcast],
		["y@newsletter", "y", JidKind.Newsletter],
	])("parses %s", (jid, user, kind) => {
		expect(parseJid(jid)).toEqual({ user, kind });
	});

	// An un-normalised platform id must be distinguishable from a canonical
	// one, so a caller can tell "not normalised" from "a group".
	it.each([
		"5511999@c.us",
		"5511999@s.whatsapp.net",
		"5511999@g.us",
	])("refuses the un-normalised %s", (jid) => {
		expect(parseJid(jid)).toBeUndefined();
	});

	it("refuses an id with no suffix", () => {
		expect(parseJid("5511999")).toBeUndefined();
	});

	it("refuses an id that is only a suffix", () => {
		expect(parseJid("@user")).toBeUndefined();
	});

	it("refuses an unknown suffix", () => {
		expect(parseJid("5511999@carrier")).toBeUndefined();
	});
});

describe("buildJid", () => {
	it("round-trips through parseJid", () => {
		const jid = buildJid("5511999", JidKind.Group);
		expect(jid).toBe("5511999@group");
		expect(parseJid(jid)).toEqual({ user: "5511999", kind: JidKind.Group });
	});
});

describe("isGroupJid", () => {
	it("is true for a group", () => {
		expect(isGroupJid("12345@group")).toBe(true);
	});

	it.each([
		"5511999@user",
		"abc@lid",
		"x@broadcast",
		"y@newsletter",
	])("is false for %s", (jid) => {
		expect(isGroupJid(jid)).toBe(false);
	});

	// A scope guard reads the id rather than fetching the chat, so an
	// un-normalised group id must not read as a group: that would be a guard
	// passing on a platform whose ids never reached the boundary.
	it("is false for an un-normalised group id", () => {
		expect(isGroupJid("12345@g.us")).toBe(false);
	});
});
