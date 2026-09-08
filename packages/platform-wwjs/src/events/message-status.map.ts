import { MessageStatus } from "nestwhats";

/**
 * whatsapp-web.js reports progress as a number on `message_ack`. The names come
 * from its own `MessageAck` constants; the values are what actually arrives.
 */
const ACK_TO_STATUS = new Map<number, MessageStatus>([
	[-1, MessageStatus.Failed], // ACK_ERROR
	[0, MessageStatus.Pending], // ACK_PENDING
	[1, MessageStatus.Sent], // ACK_SERVER
	[2, MessageStatus.Delivered], // ACK_DEVICE
	[3, MessageStatus.Read], // ACK_READ
	[4, MessageStatus.Played], // ACK_PLAYED
]);

/**
 * `undefined` for an ack this map does not know, so a value added upstream is
 * skipped rather than reported as the wrong status.
 */
export function toMessageStatus(ack: number): MessageStatus | undefined {
	return ACK_TO_STATUS.get(ack);
}
