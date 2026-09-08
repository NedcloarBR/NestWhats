import {
	type MessageUserReceipt,
	WAMessageStatus,
} from "@whiskeysockets/baileys";
import { MessageStatus } from "nestwhats";
import { toMillis } from "../structures/timestamp.js";

/**
 * Baileys reports progress as `proto.WebMessageInfo.Status` on
 * `messages.update`. The names come from the proto; the values are what
 * actually arrives.
 */
const STATUS_TO_PORTABLE: ReadonlyMap<number, MessageStatus> = new Map([
	[WAMessageStatus.ERROR, MessageStatus.Failed],
	[WAMessageStatus.PENDING, MessageStatus.Pending],
	[WAMessageStatus.SERVER_ACK, MessageStatus.Sent],
	[WAMessageStatus.DELIVERY_ACK, MessageStatus.Delivered],
	[WAMessageStatus.READ, MessageStatus.Read],
	[WAMessageStatus.PLAYED, MessageStatus.Played],
]);

/**
 * `undefined` for a status this map does not know, so a value added upstream
 * is skipped rather than reported as the wrong status.
 */
export function toMessageStatus(
	status: number | null | undefined,
): MessageStatus | undefined {
	return status === null || status === undefined
		? undefined
		: STATUS_TO_PORTABLE.get(status);
}

/**
 * A receipt says *when* each stage happened rather than *which* stage it is:
 * the furthest timestamp present is the status, and its value the time.
 */
export function receiptToStatus(
	receipt: MessageUserReceipt,
): { status: MessageStatus; timestamp: number } | undefined {
	if (receipt.playedTimestamp) {
		return {
			status: MessageStatus.Played,
			timestamp: toMillis(receipt.playedTimestamp),
		};
	}
	if (receipt.readTimestamp) {
		return {
			status: MessageStatus.Read,
			timestamp: toMillis(receipt.readTimestamp),
		};
	}
	if (receipt.receiptTimestamp) {
		return {
			status: MessageStatus.Delivered,
			timestamp: toMillis(receipt.receiptTimestamp),
		};
	}
	return undefined;
}
