/** How a poll stands after a vote, in NestWhats' canonical ids. */
export interface BaileysPollVote {
	/** Platform id of the poll message. */
	messageId: string;
	/** Chat the poll is in. */
	chatId: string;
	/**
	 * Every option and who has chosen it, as of this vote — WhatsApp reports
	 * the whole tally rather than the one change.
	 */
	results: Array<{ option: string; voters: string[] }>;
}
