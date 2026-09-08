/** Connection state of a client, reported by the adapter and tracked by the registry. */
export enum ClientStatus {
	Initializing = "initializing",
	/** Waiting for a QR code to be scanned. */
	QrReceived = "qr_received",
	/** Waiting for a pairing code to be entered on the phone. */
	PairingCodeReceived = "pairing_code_received",
	Authenticated = "authenticated",
	Ready = "ready",
	Disconnected = "disconnected",
}
