import { Injectable, Logger } from "@nestjs/common";
import { BaileysEvents, BaileysOn } from "@nestwhats/platform-baileys";
import {
	Args,
	Client,
	Command,
	Context,
	ContextOf,
	NestWhatsClient,
	On,
} from "nestwhats";

@Injectable()
export class BaileysHandler {
	private readonly logger = new Logger(BaileysHandler.name);

	// Two things a browser session cannot do at all.
	@Command({ name: "story", description: "Posts to status" })
	public async onStory(
		@Client() client: NestWhatsClient,
		@Args() text: string,
	) {
		await client.postStatus(text);
	}

	@Command({ name: "watch", description: "Subscribes to a contact presence" })
	public async onWatch(
		@Client() client: NestWhatsClient,
		@Args() contactId: string,
	) {
		// Nothing is returned: the answers arrive as `presenceUpdate` events. A
		// subscription lasts as long as the connection, so call it again after a
		// reconnect.
		await client.subscribePresence(contactId);
	}

	@On("presenceUpdate")
	public onPresence(@Context() [, update]: ContextOf<"presenceUpdate">) {
		// `lastSeenAt` is absent far more often than present, because WhatsApp
		// hides it by default. Absent means "not visible", never "never seen".
		this.logger.log(
			`${update.contactId}: ${update.state}${
				update.lastSeenAt ? ` (last seen ${new Date(update.lastSeenAt)})` : ""
			}`,
		);
	}

	// Capabilities this package registers itself, checked like a built-in one.
	@Command({ name: "community", description: "Starts a community" })
	public async onCommunity(
		@Client() client: NestWhatsClient,
		@Args() subject: string,
	) {
		if (!client.supports("createCommunity")) return;
		await client.createCommunity(subject);
	}

	/**
	 * A poll vote. It comes from no Baileys event: the adapter decrypts it
	 * against the poll it answers, so this only fires while that poll is still
	 * in the message cache.
	 */
	@BaileysOn("pollVote")
	public onVote(@Context() [, vote]: ContextOf<"pollVote", BaileysEvents>) {
		this.logger.log(`vote on ${vote.pollId}`);
	}

	/**
	 * `call` is left out of the global augmentation on purpose: the
	 * whatsapp-web.js package declares an event of the same name with a
	 * different payload, and two augmentations disagreeing is a compile error
	 * in an application that installs both. `@BaileysOn` types it; `@On` does
	 * not.
	 */
	@BaileysOn("call")
	public onCall(@Context() [, calls]: ContextOf<"call", BaileysEvents>) {
		this.logger.log(`incoming call: ${calls.length}`);
	}
}
