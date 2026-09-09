import { readFile } from "node:fs/promises";
import { Injectable, Logger } from "@nestjs/common";
import {
	AdapterCapability,
	brazilianPhoneVariants,
	CapabilityNotSupportedError,
	InjectClient,
	NestWhatsClient,
	PresenceState,
} from "nestwhats";

/**
 * Sending needs no handler. A connected number is a provider like any other,
 * so anything in the application can reach it — a cron job, an HTTP
 * controller, a queue consumer.
 */
@Injectable()
export class NotifierService {
	private readonly logger = new Logger(NotifierService.name);

	public constructor(
		@InjectClient("alerts") private readonly client: NestWhatsClient,
	) {}

	public async notify(chatId: string, text: string) {
		await this.client.sendMessage(chatId, text);
	}

	public async sendReport(chatId: string) {
		// Media is a capability: ask before calling if this has to run on more
		// than one platform.
		if (!this.client.supports(AdapterCapability.SendMedia)) {
			this.logger.warn("this platform cannot send media");
			return;
		}

		await this.client.sendMessage(chatId, {
			data: await readFile("report.pdf"),
			mimetype: "application/pdf",
			filename: "report.pdf",
			caption: "this month",
		});
	}

	public async answerSlowly(chatId: string, work: () => Promise<string>) {
		await this.client.sendPresence(chatId, PresenceState.Typing);
		const answer = await work();
		await this.client.sendPresence(chatId, PresenceState.Paused);
		await this.client.sendMessage(chatId, answer);
	}

	/**
	 * Brazilian mobiles gained a ninth digit and WhatsApp is inconsistent about
	 * it, so the same contact may only be reachable in one of the two forms.
	 * Sending to the wrong one fails silently.
	 */
	public async notifyBrazilian(phone: string, text: string) {
		for (const candidate of brazilianPhoneVariants(phone)) {
			try {
				await this.client.sendMessage(`${candidate}@user`, text);
				return candidate;
			} catch {
				// Try the next form.
			}
		}
		throw new Error(`could not reach ${phone} in any known form`);
	}

	/**
	 * Every method is async, so a capability the platform lacks comes back as a
	 * rejected promise — one `.catch` covers both that and a failure on the
	 * wire, and the error names which is which.
	 */
	public async postStatusIfPossible(text: string) {
		try {
			await this.client.postStatus(text);
		} catch (err) {
			if (err instanceof CapabilityNotSupportedError) {
				this.logger.warn(`${err.platform} cannot ${err.capability}`);
				return;
			}
			throw err;
		}
	}
}
