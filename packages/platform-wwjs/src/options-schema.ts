import type { AdapterOptionsSchema } from "nestwhats";

/**
 * The whatsapp-web.js options worth exposing in a UI. Not the full
 * `ClientOptions` — puppeteer settings and auth strategies are objects that
 * belong in code, not in a form.
 */
export const WWEBJS_OPTIONS_SCHEMA: AdapterOptionsSchema = [
	{
		key: "authMethod",
		label: "How to authenticate",
		type: "radio",
		uiOnly: true,
		default: "qr",
		choices: [
			{ value: "qr", label: "QR code", description: "Scan with the phone." },
			{
				value: "pairing",
				label: "Pairing code",
				description: "Type an 8-digit code on the phone.",
			},
		],
	},
	{
		key: "qrMaxRetries",
		label: "QR max retries",
		type: "number",
		placeholder: "0 = unlimited",
		description: "How many times the QR refreshes before giving up.",
		showWhen: { key: "authMethod", equals: "qr" },
		advanced: true,
	},
	{
		key: "pairWithPhoneNumber.phoneNumber",
		label: "Phone number",
		type: "string",
		placeholder: "5511999998888",
		description:
			"The number that will receive the pairing code, with country code.",
		showWhen: { key: "authMethod", equals: "pairing" },
	},
	{
		key: "pairWithPhoneNumber.showNotification",
		label: "Notify the phone",
		type: "boolean",
		default: true,
		description: "Pushes a linking prompt to that number.",
		showWhen: { key: "authMethod", equals: "pairing" },
	},
	{
		key: "deviceName",
		label: "Device name",
		type: "string",
		placeholder: "e.g. Support Bot",
		description:
			'Shown under "Linked devices". No effect right now — whatsapp-web.js writes it through a module WhatsApp Web dropped.',
		advanced: true,
	},
	{
		key: "browserName",
		label: "Browser",
		type: "select",
		choices: ["Chrome", "Firefox", "IE", "Opera", "Safari", "Edge"],
		description: "Same limitation as the device name.",
		advanced: true,
	},
	{
		key: "printAuthData",
		label: "Print auth data in the terminal",
		type: "boolean",
		default: true,
		description: "Also prints the QR or pairing code to the console.",
		advanced: true,
	},
	{
		key: "authTimeoutMs",
		label: "Auth timeout (ms)",
		type: "number",
		placeholder: "120000",
		description: "Raise it when starting many clients at once.",
		advanced: true,
	},
	{
		key: "takeoverOnConflict",
		label: "Take over on conflict",
		type: "boolean",
		default: false,
		description: "Reclaim the session when another browser opens it.",
		advanced: true,
	},
	{
		key: "userAgent",
		label: "User agent",
		type: "string",
		placeholder: "Mozilla/5.0 …",
		description: "Overrides the browser user agent.",
		advanced: true,
	},
];
