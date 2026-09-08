import type { AdapterOptionsSchema } from "nestwhats";

/**
 * The Baileys options worth exposing in a UI. Not the full `SocketConfig` —
 * caches, agents and the signal repository are objects that belong in code,
 * not in a form.
 */
export const BAILEYS_OPTIONS_SCHEMA: AdapterOptionsSchema = [
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
		key: "phoneNumber",
		label: "Phone number",
		type: "string",
		placeholder: "5511999998888",
		description:
			"The number that will be linked, with country code and no punctuation.",
		showWhen: { key: "authMethod", equals: "pairing" },
	},
	{
		key: "passkeyTimeoutMs",
		label: "Passkey answer timeout (ms)",
		type: "number",
		placeholder: "60000",
		description:
			"How long to wait for the account's passkey to sign, when WhatsApp asks for one.",
		advanced: true,
	},
	{
		key: "qrTimeout",
		label: "QR refresh interval (ms)",
		type: "number",
		placeholder: "60000",
		description:
			"How long each QR stays valid before a new one is generated. Baileys' own default is 60s for the first and 20s for each one after.",
		showWhen: { key: "authMethod", equals: "qr" },
		advanced: true,
	},
	{
		key: "authDir",
		label: "Auth directory",
		type: "string",
		default: ".baileys_auth",
		description:
			"Where credentials are kept. Each client gets its own session-<name> folder inside it.",
		advanced: true,
	},
	{
		key: "deviceName",
		label: "Device name",
		type: "string",
		placeholder: "Ubuntu",
		description:
			'Shown under "Linked devices" as the device. Applied while pairing, so re-link to change it. A desktop identity is also what makes WhatsApp send more history.',
		advanced: true,
	},
	{
		key: "browserName",
		label: "Browser",
		type: "string",
		placeholder: "Chrome",
		description: 'Shown under "Linked devices" next to the device name.',
		advanced: true,
	},
	{
		key: "chatStore",
		label: "Track the chat list",
		type: "boolean",
		default: true,
		description:
			"Keep the conversations this client knows about, from the events WhatsApp sends. Off, only groups can be listed.",
	},
	{
		key: "groupCache",
		label: "Cache group participants",
		type: "boolean",
		default: true,
		description:
			"Avoids asking WhatsApp for the participant list on every group message, which is how accounts get rate-limited.",
		advanced: true,
	},
	{
		key: "messageCacheMax",
		label: "Messages to remember",
		type: "number",
		placeholder: "2000",
		description:
			"Backs message resends, revokes, read markers and poll votes. Content only, never media.",
		advanced: true,
	},
	{
		key: "chatStoreMax",
		label: "Chats to keep",
		type: "number",
		placeholder: "1000",
		description: "Least recently active are dropped first.",
		showWhen: { key: "chatStore", equals: true },
		advanced: true,
	},
	{
		key: "syncFullHistory",
		label: "Sync full history",
		type: "boolean",
		default: true,
		description:
			"Ask the phone for the whole chat history on first link. Off keeps the initial sync short.",
		advanced: true,
	},
	{
		key: "markOnlineOnConnect",
		label: "Appear online on connect",
		type: "boolean",
		default: true,
		description:
			"Off keeps the phone receiving push notifications while the bot is connected — WhatsApp treats an online client as the active session.",
		advanced: true,
	},
	{
		key: "rejectCalls",
		label: "Decline incoming calls",
		type: "boolean",
		default: false,
		description:
			"Hang up on every call as it arrives. The call event still fires.",
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
		key: "fetchLatestVersion",
		label: "Fetch latest WhatsApp Web version",
		type: "boolean",
		default: true,
		description:
			"Look up the current version before connecting. Off uses the one bundled with Baileys.",
		advanced: true,
	},
	{
		key: "keepAliveIntervalMs",
		label: "Keep-alive interval (ms)",
		type: "number",
		placeholder: "30000",
		description: "How often the socket pings WhatsApp on an idle connection.",
		advanced: true,
	},
	{
		key: "connectTimeoutMs",
		label: "Connect timeout (ms)",
		type: "number",
		placeholder: "20000",
		description: "How long to wait for the socket to open before giving up.",
		advanced: true,
	},
	{
		key: "defaultQueryTimeoutMs",
		label: "Query timeout (ms)",
		type: "number",
		placeholder: "60000",
		description: "How long to wait for WhatsApp to answer a query.",
		advanced: true,
	},
	{
		key: "logLevel",
		label: "Baileys log level",
		type: "select",
		default: "error",
		choices: ["silent", "error", "warn", "info", "debug", "trace"],
		description: "How much of Baileys' own logging reaches the Nest logger.",
		advanced: true,
	},
];
