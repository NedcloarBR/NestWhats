/**
 * Brazilian mobile numbers gained a leading `9` in the 2010s, and WhatsApp is
 * inconsistent about it: the same contact may be reachable as
 * `5531988887777` (13 digits) or `553188887777` (12), depending on when the
 * number was saved and by whom. Sending to the wrong form silently fails.
 *
 * Returns the forms worth trying, original first. Non-Brazilian numbers and
 * ones with no known alternative come back as a single entry.
 *
 * Landlines have eight digits and never take the ninth, so the added variant is
 * meaningless for them — harmless as a fallback attempt, but do not read it as
 * "this number exists".
 */
export function brazilianPhoneVariants(phone: string): string[] {
	const digits = phone.replace(/\D/g, "");
	if (!digits.startsWith("55")) return [digits];

	// 55 + DD = 4 characters, then the subscriber number.
	const prefix = digits.slice(0, 4);
	const subscriber = digits.slice(4);

	if (subscriber.length === 9 && subscriber.startsWith("9")) {
		return [digits, prefix + subscriber.slice(1)];
	}
	if (subscriber.length === 8) {
		return [digits, `${prefix}9${subscriber}`];
	}
	return [digits];
}
