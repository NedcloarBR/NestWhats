/**
 * A single adapter option, described well enough for a UI to render an input
 * for it. Adapters declare these so tools like the dashboard can offer real
 * fields instead of asking someone to hand-write JSON — and so a new adapter
 * gets that for free, without the tool knowing anything about it.
 */
export interface AdapterOptionChoice {
	/** What is stored in the options object. */
	value: string;
	/** What the form shows. */
	label: string;
	/** One line under the choice, where the label is not enough. */
	description?: string;
}

/** Shows a field only while another one holds a given value. */
export interface AdapterOptionCondition {
	/** Another field's key, which must exist in the same schema. */
	key: string;
	/** The value that field must hold for this one to be shown. */
	equals: string | number | boolean;
}

/** One field in an adapter's options form. */
export interface AdapterOptionField {
	/**
	 * Property in the adapter's options object. Dots address a nested one:
	 * `pairWithPhoneNumber.phoneNumber` sets
	 * `{ pairWithPhoneNumber: { phoneNumber: … } }`.
	 */
	key: string;
	/** What the form shows next to the input. */
	label: string;
	/** Which control to render. */
	type: "string" | "number" | "boolean" | "select" | "radio";
	/** Allowed values, for `select` and `radio`. */
	choices?: readonly (string | AdapterOptionChoice)[];
	placeholder?: string;
	/**
	 * What the adapter uses when the option is absent. A UI needs it to show a
	 * checkbox in the right state, and to tell "left alone" from "turned off" —
	 * omitting a `false` would silently keep a `true` default.
	 */
	default?: string | number | boolean;
	/** One line explaining what it does, shown next to the field. */
	description?: string;
	/**
	 * A choice that shapes the form without being an adapter option itself —
	 * "QR or pairing code", for instance, which is really decided by whether a
	 * phone number is filled in. Never sent to the adapter.
	 */
	uiOnly?: boolean;
	/**
	 * Only show this field while `condition` holds. A hidden field is never
	 * collected, so switching away from a mode drops what was typed in it.
	 */
	showWhen?: AdapterOptionCondition;
	/**
	 * Tuning most people never touch. A UI can fold these away so the handful
	 * of options that actually matter stay visible.
	 */
	advanced?: boolean;
}

/**
 * The options an adapter offers a UI, in the order they should be rendered.
 *
 * Non-exhaustive by design: it drives form fields, it does not limit what the
 * adapter's constructor accepts.
 */
export type AdapterOptionsSchema = readonly AdapterOptionField[];
