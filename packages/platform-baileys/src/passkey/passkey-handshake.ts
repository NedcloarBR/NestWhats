import crypto from "node:crypto";
import type { Logger } from "@nestjs/common";
import {
	type AuthenticationCreds,
	type BinaryNode,
	Curve,
	type WASocket,
} from "@whiskeysockets/baileys";
import {
	decodePrimaryEphemeralIdentity,
	encodeCompanionEphemeralIdentity,
	encodeEncryptedPairingRequest,
	encodePairingRequest,
	encodeProloguePayload,
} from "./protobuf.js";

const SERVER_JID = "@s.whatsapp.net";
const HANDOFF_INFO = "shortcake-passkey-handoff-v1";
const KEY_INFO = "Pairing Information Encryption Key";
const DEVICE_TYPE_CHROME = 1;
/** How long WhatsApp normally takes to answer the prologue; past it, it will not. */
const CONTINUATION_TIMEOUT_MS = 45_000;

const PROLOGUE_EVENT = "CB:notification,type:passkey_prologue_request";
const CONTINUATION_EVENT = "CB:notification,type:crsc_continuation";

/**
 * The WebAuthn assertion, as `navigator.credentials.get()` serialises it —
 * every binary field base64url.
 */
export interface WebAuthnAssertion {
	id: string;
	rawId: string;
	type: string;
	response: {
		clientDataJSON: string;
		authenticatorData: string;
		signature: string;
		userHandle: string | null;
	};
}

/** Which client a passkey challenge is for. */
export interface PasskeyContext {
	/** The client being linked; a virtual client's name included. */
	clientName?: string;
	/** The number being linked, when pairing by code; absent when by QR. */
	phoneNumber?: string;
}

/**
 * Signs WhatsApp's passkey challenge.
 *
 * The adapter has no authenticator: the passkey lives wherever the account
 * holder keeps it — a browser, a phone, a vault — and this is how the
 * application reaches it. `requestOptions` is the `PublicKeyCredentialRequestOptions`
 * WhatsApp sent, to hand to `navigator.credentials.get()` or its server-side
 * equivalent as it is. `context` says which client is asking, so one signer
 * on the factory serves every client — virtual ones included, whose options
 * are persisted as JSON and could never carry a function.
 */
export type PasskeyAssertionSigner = (
	requestOptions: unknown,
	context: PasskeyContext,
) => Promise<WebAuthnAssertion>;

/**
 * What the `passkeyChallenge` event carries when no signer is configured:
 * the challenge, and the two ways to answer it. Answer with `resolve` from
 * the handler, or later through `resolvePasskey` on the adapter or the
 * messaging service — whichever is first wins.
 */
export interface PasskeyChallenge extends PasskeyContext {
	/** The `PublicKeyCredentialRequestOptions` WhatsApp sent, untouched. */
	requestOptions: unknown;
	resolve(assertion: WebAuthnAssertion): void;
	reject(reason?: unknown): void;
}

/** How a passkey pairing ended, carried by the `passkeyResult` event. */
export interface PasskeyResult extends PasskeyContext {
	ok: boolean;
	/** Why it failed; `timeout` when WhatsApp never confirmed. */
	error?: string;
}

type KeyPair = { private: Uint8Array; public: Uint8Array };

type PendingPairing = {
	keyPair: KeyPair;
	companionNonce: Buffer;
	pairingRef: string;
	deviceType: number;
};

const sha256 = (buf: Uint8Array): Buffer =>
	crypto.createHash("sha256").update(buf).digest();

const b64urlDecode = (s: string): Buffer =>
	Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

function hkdf(
	ikm: Uint8Array,
	salt: Uint8Array,
	info: string,
	len: number,
): Buffer {
	return Buffer.from(
		crypto.hkdfSync("sha256", ikm, salt, Buffer.from(info, "utf8"), len),
	);
}

function childByTag(node: BinaryNode, tag: string): BinaryNode | undefined {
	return Array.isArray(node.content)
		? node.content.find((c) => c.tag === tag)
		: undefined;
}

function contentBuffer(node?: BinaryNode): Buffer {
	if (!node || node.content == null || Array.isArray(node.content)) {
		return Buffer.alloc(0);
	}
	return typeof node.content === "string"
		? Buffer.from(node.content)
		: Buffer.from(node.content);
}

/**
 * Pairing by passkey, for accounts WhatsApp has moved onto it.
 *
 * Some numbers are no longer allowed to link a device by QR or pairing code
 * alone: WhatsApp answers the pairing-code request with a
 * `passkey_prologue_request` carrying a WebAuthn challenge, and the link only
 * completes once the account's passkey has signed it. The exchange is three
 * `md` IQs on top of the ordinary pairing-code flow:
 *
 * 1. `passkey_prologue` — the signed assertion, plus this device's ephemeral
 *    identity and a commitment to a nonce it reveals later;
 * 2. `companion_nonce` — sent once WhatsApp answers with `crsc_continuation`
 *    and its own ephemeral identity;
 * 3. `encrypted_pairing_request` — this device's noise key, identity key and
 *    adv secret, encrypted under the key both sides can now derive.
 *
 * Baileys knows none of this, so the handshake listens on the raw WebSocket
 * for the two notifications and speaks the IQs itself. It rotates the adv
 * secret before signing and proves ownership of the old one through an HMAC,
 * which is what lets an already-linked session hand itself off rather than
 * count as a new device.
 *
 * Verified in production on 7.0.0-rc14 — the protocol is undocumented, and
 * the field numbers and info strings here come from observing WhatsApp Web.
 */
export class PasskeyHandshake {
	private pending: PendingPairing | undefined;
	private handoffKey: Buffer | undefined;
	private continuationTimer: NodeJS.Timeout | undefined;
	private readonly onPrologue = (node: BinaryNode) =>
		void this.handlePrologue(node).catch((err: unknown) => {
			this.logger.error(
				`${this.label}Passkey prologue failed: ${describe(err)}`,
			);
			this.onResult({ ok: false, error: describe(err) });
		});
	private readonly onContinuation = (node: BinaryNode) =>
		void this.handleContinuation(node).catch((err: unknown) =>
			this.logger.error(
				`${this.label}Passkey continuation failed: ${describe(err)}`,
			),
		);

	/**
	 * @param sign - produces the assertion; the adapter decides whether that
	 * is a configured signer or the `passkeyChallenge` event.
	 * @param onResult - told how the pairing ended, once.
	 */
	public constructor(
		private readonly sock: WASocket,
		private readonly creds: AuthenticationCreds,
		private readonly saveCreds: () => Promise<void>,
		private readonly sign: (
			requestOptions: unknown,
		) => Promise<WebAuthnAssertion>,
		private readonly logger: Logger,
		private readonly label = "",
		private readonly onResult: (result: {
			ok: boolean;
			error?: string;
		}) => void = () => {},
	) {}

	/** Starts listening on this socket. Call once per socket; `dispose` undoes it. */
	public register(): void {
		this.sock.ws.on(PROLOGUE_EVENT, this.onPrologue);
		this.sock.ws.on(CONTINUATION_EVENT, this.onContinuation);
	}

	/** Detaches from the socket and forgets a pairing in flight. */
	public dispose(): void {
		this.sock.ws.off(PROLOGUE_EVENT, this.onPrologue);
		this.sock.ws.off(CONTINUATION_EVENT, this.onContinuation);
		this.clearTimer();
		this.pending = undefined;
		this.handoffKey = undefined;
	}

	private clearTimer(): void {
		if (!this.continuationTimer) return;
		clearTimeout(this.continuationTimer);
		this.continuationTimer = undefined;
	}

	private async handlePrologue(node: BinaryNode): Promise<void> {
		const requestOptions: unknown = JSON.parse(
			contentBuffer(childByTag(node, "passkey_request_options")).toString(
				"utf8",
			),
		);
		this.logger.verbose(
			`${this.label}WhatsApp asked for a passkey; signing the challenge`,
		);

		// The old adv secret proves this is the same device handing itself off;
		// the new one is what the pairing request carries. Persisted before the
		// signer is called, so a crash in between cannot leave two sessions
		// claiming the old secret.
		const previousSecret = Buffer.from(this.creds.advSecretKey, "base64");
		this.handoffKey = hkdf(previousSecret, Buffer.alloc(32), HANDOFF_INFO, 32);
		this.creds.advSecretKey = crypto.randomBytes(32).toString("base64");
		await this.saveCreds();

		const assertion = await this.sign(requestOptions);

		const pairingRef = await this.fetchRef();
		const keyPair = Curve.generateKeyPair();
		const companionNonce = crypto.randomBytes(32);
		const identity = encodeCompanionEphemeralIdentity(
			keyPair.public,
			DEVICE_TYPE_CHROME,
			pairingRef,
		);
		const commitmentHash = sha256(Buffer.concat([identity, companionNonce]));
		const prologuePayload = encodeProloguePayload(identity, commitmentHash);
		this.pending = {
			keyPair,
			companionNonce,
			pairingRef,
			deviceType: DEVICE_TYPE_CHROME,
		};

		const proof = crypto
			.createHmac("sha256", this.handoffKey)
			.update(prologuePayload)
			.digest();

		await this.sock.query({
			tag: "iq",
			attrs: { to: SERVER_JID, type: "set", xmlns: "md" },
			content: [
				{
					tag: "passkey_prologue",
					attrs: {},
					content: [
						{
							tag: "credential_id",
							attrs: {},
							content: b64urlDecode(assertion.rawId),
						},
						{
							tag: "webauthn_assertion",
							attrs: {},
							content: Buffer.from(JSON.stringify(assertion), "utf8"),
						},
						{ tag: "prologue_payload", attrs: {}, content: prologuePayload },
						{ tag: "pairing_handoff_proof", attrs: {}, content: proof },
					],
				},
			],
		});
		this.logger.verbose(
			`${this.label}Passkey prologue sent; waiting for WhatsApp to continue`,
		);

		this.clearTimer();
		this.continuationTimer = setTimeout(() => {
			this.continuationTimer = undefined;
			this.logger.warn(
				`${this.label}WhatsApp did not confirm the passkey within ${CONTINUATION_TIMEOUT_MS / 1000}s. Check WhatsApp → Linked devices for the device limit, and wait a few minutes before trying again — repeated attempts are rate-limited.`,
			);
			this.onResult({ ok: false, error: "timeout" });
		}, CONTINUATION_TIMEOUT_MS);
		this.continuationTimer.unref?.();
	}

	private async handleContinuation(node: BinaryNode): Promise<void> {
		this.clearTimer();
		const pending = this.pending;
		if (!pending) return;

		const primary = decodePrimaryEphemeralIdentity(
			contentBuffer(childByTag(node, "primary_ephemeral_identity")),
		);
		const shared = Curve.sharedKey(pending.keyPair.private, primary.publicKey);

		await this.sock.query({
			tag: "iq",
			attrs: { to: SERVER_JID, type: "set", xmlns: "md" },
			content: [
				{ tag: "companion_nonce", attrs: {}, content: pending.companionNonce },
			],
		});

		const salt = `Companion Pairing ${pending.deviceType} with ref ${pending.pairingRef}`;
		const encryptionKey = hkdf(shared, Buffer.from(salt, "utf8"), KEY_INFO, 32);

		const pairingRequest = encodePairingRequest(
			this.creds.noiseKey.public,
			this.creds.signedIdentityKey.public,
			Buffer.from(this.creds.advSecretKey, "base64"),
		);
		const iv = crypto.randomBytes(12);
		const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
		const ciphertext = Buffer.concat([
			cipher.update(pairingRequest),
			cipher.final(),
			cipher.getAuthTag(),
		]);

		await this.sock.query({
			tag: "iq",
			attrs: { to: SERVER_JID, type: "set", xmlns: "md" },
			content: [
				{
					tag: "encrypted_pairing_request",
					attrs: {},
					content: encodeEncryptedPairingRequest(ciphertext, iv),
				},
			],
		});
		this.logger.verbose(
			`${this.label}Encrypted pairing request sent; passkey pairing complete`,
		);
		this.pending = undefined;
		this.handoffKey = undefined;
		this.onResult({ ok: true });
	}

	private async fetchRef(): Promise<string> {
		const response: BinaryNode = await this.sock.query({
			tag: "iq",
			attrs: { to: SERVER_JID, type: "get", xmlns: "md" },
			content: [{ tag: "ref", attrs: {} }],
		});
		return contentBuffer(childByTag(response, "ref")).toString("utf8");
	}
}

function describe(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}
