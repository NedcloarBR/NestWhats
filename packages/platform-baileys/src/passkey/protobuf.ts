/**
 * Hand-rolled protobuf for the four passkey pairing messages.
 *
 * WhatsApp's proto definitions for these are not in Baileys' `WAProto`, and
 * pulling protobufjs in to describe four flat messages would be more code than
 * writing the wire format directly: every field here is either a varint or a
 * length-delimited blob. Field numbers are what WhatsApp Web sends.
 */

type Bytes = Uint8Array;

function writeVarint(value: number): number[] {
	const out: number[] = [];
	let v = value >>> 0;
	while (v > 0x7f) {
		out.push((v & 0x7f) | 0x80);
		v >>>= 7;
	}
	out.push(v);
	return out;
}

function fieldLenDelimited(fieldNum: number, data: Bytes): number[] {
	const tag = (fieldNum << 3) | 2;
	return [...writeVarint(tag), ...writeVarint(data.length), ...data];
}

function fieldVarint(fieldNum: number, value: number): number[] {
	const tag = (fieldNum << 3) | 0;
	return [...writeVarint(tag), ...writeVarint(value)];
}

/** `{ publicKey: bytes = 1, deviceType: varint = 2, ref: string = 3 }` */
export function encodeCompanionEphemeralIdentity(
	publicKey: Bytes,
	deviceType: number,
	ref: string,
): Buffer {
	return Buffer.from([
		...fieldLenDelimited(1, publicKey),
		...fieldVarint(2, deviceType),
		...fieldLenDelimited(3, new TextEncoder().encode(ref)),
	]);
}

/** `{ companionEphemeralIdentity: bytes = 1, commitment: { hash: bytes = 1 } = 2 }` */
export function encodeProloguePayload(
	companionEphemeralIdentity: Bytes,
	commitmentHash: Bytes,
): Buffer {
	const commitment = Buffer.from(fieldLenDelimited(1, commitmentHash));
	return Buffer.from([
		...fieldLenDelimited(1, companionEphemeralIdentity),
		...fieldLenDelimited(2, commitment),
	]);
}

/** `{ companionPublicKey: bytes = 1, companionIdentityKey: bytes = 2, advSecret: bytes = 3 }` */
export function encodePairingRequest(
	companionPublicKey: Bytes,
	companionIdentityKey: Bytes,
	advSecret: Bytes,
): Buffer {
	return Buffer.from([
		...fieldLenDelimited(1, companionPublicKey),
		...fieldLenDelimited(2, companionIdentityKey),
		...fieldLenDelimited(3, advSecret),
	]);
}

/** `{ encryptedPayload: bytes = 1, iv: bytes = 2 }` */
export function encodeEncryptedPairingRequest(
	encryptedPayload: Bytes,
	iv: Bytes,
): Buffer {
	return Buffer.from([
		...fieldLenDelimited(1, encryptedPayload),
		...fieldLenDelimited(2, iv),
	]);
}

/** `{ publicKey: bytes = 1, nonce: bytes = 2 }`; unknown fields are skipped. */
export function decodePrimaryEphemeralIdentity(buf: Bytes): {
	publicKey: Buffer;
	nonce: Buffer;
} {
	let i = 0;
	const readVarint = (): number => {
		let shift = 0;
		let result = 0;
		while (i < buf.length) {
			const b = buf[i++] as number;
			result |= (b & 0x7f) << shift;
			if ((b & 0x80) === 0) break;
			shift += 7;
		}
		return result >>> 0;
	};
	let publicKey = Buffer.alloc(0);
	let nonce = Buffer.alloc(0);
	while (i < buf.length) {
		const tag = readVarint();
		const fieldNum = tag >> 3;
		const wireType = tag & 7;
		if (wireType !== 2) {
			if (wireType === 0) readVarint();
			continue;
		}
		const len = readVarint();
		const data = Buffer.from(buf.slice(i, i + len));
		i += len;
		if (fieldNum === 1) publicKey = data;
		else if (fieldNum === 2) nonce = data;
	}
	return { publicKey, nonce };
}
