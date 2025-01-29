import {
	BatteryInfo,
	Call,
	GroupNotification,
	Message,
	MessageAck,
	WAState,
} from "whatsapp-web.js";

export interface ClientEvents {
	auth_failure: [message: string];
	authenticated;
	change_battery: [batteryInfo: BatteryInfo];
	call: [call: Call];
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
	loading_screen;
	media_uploaded: [message: Message];
	message_ack: [message: Message, ack: MessageAck];
	message_ciphertext: [message: Message];
	message_create: [message: Message];
	message_edit: [message: Message, newBody: string, prevBody: string];
	message: [message: Message];
	message_revoke_everyone: [message: Message, revoked_msg: Message];
	message_revoke_me: [message: Message];
	qr: [qr: string];
	ready;
	remote_session_saved;
}

export type NestWhatsEvents = ClientEvents;
