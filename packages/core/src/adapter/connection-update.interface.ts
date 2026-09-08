import type { ClientStatus } from "./client-status.enum.js";
import type { DisconnectReason } from "./disconnect-reason.js";

/**
 * A single connection-state change, reported by the adapter.
 *
 * Platforms differ in how they authenticate: whatsapp-web.js and Baileys use a
 * QR code, Baileys also supports a pairing code, and the official Cloud API has
 * neither. Every field but `status` is therefore optional — an adapter fills in
 * what its platform actually provides instead of faking the rest.
 */
export interface ConnectionUpdate {
	status: ClientStatus;
	/** Raw QR payload; pair with `ClientStatus.QrReceived`. */
	qr?: string;
	/** Pairing code; pair with `ClientStatus.PairingCodeReceived`. */
	pairingCode?: string;
	/** Why the connection closed; only meaningful for `Disconnected`. */
	reason?: DisconnectReason;
}
