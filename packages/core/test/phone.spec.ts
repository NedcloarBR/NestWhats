import { describe, expect, it } from "vitest";
import { brazilianPhoneVariants } from "../src/structures/phone.js";

describe("brazilianPhoneVariants", () => {
	// The reason it exists: WhatsApp is inconsistent about the ninth digit
	// Brazilian mobiles gained, and sending to the wrong form fails silently.
	it("offers the eight-digit form for a nine-digit mobile", () => {
		expect(brazilianPhoneVariants("5531988887777")).toEqual([
			"5531988887777",
			"553188887777",
		]);
	});

	it("offers the nine-digit form for an eight-digit number", () => {
		expect(brazilianPhoneVariants("553188887777")).toEqual([
			"553188887777",
			"5531988887777",
		]);
	});

	it("always puts the original first", () => {
		expect(brazilianPhoneVariants("5531988887777")[0]).toBe("5531988887777");
		expect(brazilianPhoneVariants("553188887777")[0]).toBe("553188887777");
	});

	it("round-trips: each form suggests the other", () => {
		const [, alternative] = brazilianPhoneVariants("5531988887777");
		expect(brazilianPhoneVariants(alternative)[1]).toBe("5531988887777");
	});

	it("strips punctuation before deciding", () => {
		expect(brazilianPhoneVariants("+55 (31) 98888-7777")).toEqual([
			"5531988887777",
			"553188887777",
		]);
	});

	it("leaves a non-Brazilian number alone", () => {
		expect(brazilianPhoneVariants("14155552671")).toEqual(["14155552671"]);
	});

	// A nine-digit subscriber number that does not start with 9 is not the
	// ninth-digit case, so there is nothing to strip.
	it("does not strip a leading digit that is not the ninth", () => {
		expect(brazilianPhoneVariants("5531888887777")).toEqual(["5531888887777"]);
	});

	it("leaves a length it has no rule for alone", () => {
		expect(brazilianPhoneVariants("5531999")).toEqual(["5531999"]);
	});

	it("handles an empty string", () => {
		expect(brazilianPhoneVariants("")).toEqual([""]);
	});

	// Landlines have eight digits and never took the ninth, so the extra form
	// is a fallback attempt, not evidence the number exists.
	it("still offers the variant for an eight-digit landline", () => {
		expect(brazilianPhoneVariants("553133334444")).toHaveLength(2);
	});
});
