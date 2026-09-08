import { describe, expect, it } from "vitest";
import { DDI_LOCALE } from "../src/constants/phone-ddi.js";
import { ddiOf, ddiOfMessage, phoneOfMessage } from "../src/phone.util.js";

describe("ddiOf", () => {
	it.each([
		["5531988887777", "55"],
		["14155552671", "1"],
		["595981234567", "595"],
	])("reads the code off %s", (phone, ddi) => {
		expect(ddiOf(phone)).toBe(ddi);
	});

	// `55` and `595` both start with a 5, so a shorter-first match would put
	// every Paraguayan number in Brazil.
	it("prefers the longest matching prefix", () => {
		expect(ddiOf("595981234567")).toBe("595");
		expect(ddiOf("5531988887777")).toBe("55");
	});

	it("strips punctuation first", () => {
		expect(ddiOf("+55 (31) 98888-7777")).toBe("55");
	});

	it("is undefined for a code with no entry", () => {
		expect(ddiOf("9991234567")).toBeUndefined();
	});

	it("is undefined for an empty string", () => {
		expect(ddiOf("")).toBeUndefined();
	});

	it("maps every code in the table to a locale", () => {
		for (const [code, locale] of Object.entries(DDI_LOCALE)) {
			expect(ddiOf(`${code}999999999`)).toBeTruthy();
			expect(locale).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
		}
	});
});

/** Only what the helper reads, so the fixture stays honest about the contract. */
function message(senderId: string, contact?: unknown) {
	return {
		senderId,
		getContact: contact === undefined ? undefined : async () => contact,
	} as never;
}

describe("phoneOfMessage", () => {
	it("reads a user id directly, with no lookup", async () => {
		await expect(phoneOfMessage(message("5531988887777@user"))).resolves.toBe(
			"5531988887777",
		);
	});

	// A LID is WhatsApp's privacy-preserving address: it carries no number, so
	// the contact has to be resolved.
	it("resolves a LID through the contact", async () => {
		const msg = message("abc@lid", { id: "x@user", phone: "5531988887777" });
		await expect(phoneOfMessage(msg)).resolves.toBe("5531988887777");
	});

	it("falls back to the contact id when it has no phone field", async () => {
		const msg = message("abc@lid", { id: "5531988887777@user" });
		await expect(phoneOfMessage(msg)).resolves.toBe("5531988887777");
	});

	// Not every platform can fetch a contact. That is "the number is not
	// visible", not an error to propagate.
	it("is undefined when the lookup throws", async () => {
		const msg = {
			senderId: "abc@lid",
			getContact: async () => {
				throw new Error("this platform cannot read contacts");
			},
		} as never;
		await expect(phoneOfMessage(msg)).resolves.toBeUndefined();
	});

	it("is undefined when the platform has no getContact at all", async () => {
		await expect(phoneOfMessage(message("abc@lid"))).resolves.toBeUndefined();
	});

	it.each([
		"12345@group",
		"x@broadcast",
		"y@newsletter",
	])("is undefined for %s, which has no phone behind it", async (senderId) => {
		await expect(phoneOfMessage(message(senderId))).resolves.toBeUndefined();
	});

	it("is undefined with no message and no sender", async () => {
		await expect(phoneOfMessage(undefined)).resolves.toBeUndefined();
		await expect(
			phoneOfMessage({ senderId: "" } as never),
		).resolves.toBeUndefined();
	});
});

describe("ddiOfMessage", () => {
	it("goes from a user id to a country code", async () => {
		await expect(ddiOfMessage(message("5531988887777@user"))).resolves.toBe(
			"55",
		);
	});

	it("is undefined when there is no number to read", async () => {
		await expect(ddiOfMessage(message("12345@group"))).resolves.toBeUndefined();
	});
});
