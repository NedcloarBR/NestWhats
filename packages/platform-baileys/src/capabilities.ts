import { registerCapability } from "nestwhats";

/**
 * What Baileys can do that the core has no name for: communities, channels,
 * declining calls, and the account's privacy settings. They are declared
 * here rather than hidden behind `raw`, so `client.supports('rejectCall')`
 * answers, and a dashboard lists them.
 *
 * The augmentation is the type side; `registerCapability` below is the runtime
 * side. Both run on import, so importing the package is all a consumer does.
 */
declare module "nestwhats" {
	interface AdapterCapabilities {
		/** `createCommunity` — starting a community, a group that holds groups. */
		createCommunity: "createCommunity";
		/** `createNewsletter` — starting a channel (WhatsApp's broadcast feed). */
		createNewsletter: "createNewsletter";
		/** `getNewsletter` — reading a channel, by id or by invite code. */
		readNewsletter: "getNewsletter";
		/** `getCommunity` — reading a community, with the community operations on it. */
		readCommunity: "getCommunity";
		/** `joinGroup` — joining a group by invite code. */
		joinGroup: "joinGroup";
		/** `getInviteInfo` — looking at a group before joining it. */
		previewInvite: "getInviteInfo";
		/** `setDefaultDisappearing` — the account's default timer for new chats. */
		setDisappearing: "setDefaultDisappearing";
		/** `rejectCall` — declining an incoming call. */
		rejectCall: "rejectCall";
		/** `getPrivacySettings` — reading the account's privacy settings. */
		readPrivacy: "getPrivacySettings";
		/** `setPrivacySettings` — changing the account's privacy settings. */
		setPrivacy: "setPrivacySettings";
	}
}

registerCapability("createCommunity", "createCommunity");
registerCapability("createNewsletter", "createNewsletter");
registerCapability("readNewsletter", "getNewsletter");
registerCapability("readCommunity", "getCommunity");
registerCapability("joinGroup", "joinGroup");
registerCapability("previewInvite", "getInviteInfo");
registerCapability("setDisappearing", "setDefaultDisappearing");
registerCapability("rejectCall", "rejectCall");
registerCapability("readPrivacy", "getPrivacySettings");
registerCapability("setPrivacy", "setPrivacySettings");
