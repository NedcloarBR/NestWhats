import {
	BatteryInfo,
	Call,
	Chat,
	GroupNotification,
	Message,
	MessageAck,
	PollVote,
	Reaction,
	WAState,
} from "whatsapp-web.js";

export interface ClientEvents {
	auth_failure: [message: string];
	authenticated;
	/** @deprecated Battery status events are no longer supported by WhatsApp */
	change_battery: [batteryInfo: BatteryInfo];
	change_state: [state: WAState];
	call: [call: Call];
	chat_archived: [chat: Chat, currState: boolean, prevState: boolean];
	chat_removed: [chat: Chat];
	code: [code: string];
	contact_changed: [
		message: Message,
		oldId: string,
		newId: string,
		isContact: string,
	];
	disconnected: [reason: WAState | "LOGOUT"];
	group_admin_changed: [notification: GroupNotification];
	group_join: [notification: GroupNotification];
	group_leave: [notification: GroupNotification];
	group_membership_request: [notification: GroupNotification];
	group_update: [notification: GroupNotification];
	loading_screen: [percent: string, message: string];
	media_uploaded: [message: Message];
	message_ack: [message: Message, ack: MessageAck];
	message_ciphertext: [message: Message];
	message_ciphertext_failed: [message: Message];
	message_create: [message: Message];
	message_edit: [message: Message, newBody: string, prevBody: string];
	message: [message: Message];
	message_reaction: [reaction: Reaction];
	message_revoke_everyone: [message: Message, revoked_msg: Message | null];
	message_revoke_me: [message: Message];
	qr: [qr: string];
	ready;
	remote_session_saved;
	unread_count: [chat: Chat];
	vote_update: [vote: PollVote];
}

export type NestWhatsEvents = ClientEvents;
