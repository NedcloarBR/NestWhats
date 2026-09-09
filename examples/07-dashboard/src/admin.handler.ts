import { Injectable } from "@nestjs/common";
import { WhatsAppWebJsAdapterFactory } from "@nestwhats/platform-whatsapp-web.js";
import {
	Args,
	ClientsRegistryService,
	Command,
	Message,
	NestWhatsClientManagerService,
	NestWhatsMessage,
} from "nestwhats";

/**
 * Everything the dashboard's buttons do is also an API, so your own admin
 * endpoint can do the same.
 */
@Injectable()
export class AdminHandler {
	public constructor(
		private readonly manager: NestWhatsClientManagerService,
		private readonly registry: ClientsRegistryService,
	) {}

	@Command({ name: "clients", description: "Lists every client and its state" })
	public async onClients(@Message() message: NestWhatsMessage) {
		const summary = this.registry.getSummary();
		await message.reply(
			summary.map((c) => `${c.name}: ${c.status}`).join("\n") || "none",
		);
	}

	// A virtual client is created while the app runs, rather than declared in
	// code. It has no injection token — nothing knew about it at boot — so it
	// is reached through the registry or the messaging service.
	@Command({ name: "add", description: "Creates a client at runtime" })
	public async onAdd(
		@Message() message: NestWhatsMessage,
		@Args() name: string,
	) {
		await this.manager.createClient({
			name,
			adapter: WhatsAppWebJsAdapterFactory,
		});
		await message.reply(`created "${name}" — scan its QR in the dashboard`);
	}

	@Command({ name: "drop", description: "Destroys a virtual client" })
	public async onDrop(
		@Message() message: NestWhatsMessage,
		@Args() name: string,
	) {
		// Only virtual clients can be destroyed; a declared one belongs to the
		// application lifecycle.
		await this.manager.destroyClient(name);
		await message.reply(`destroyed "${name}"`);
	}

	@Command({ name: "prefix", description: "Changes this client prefix" })
	public async onPrefix(
		@Message() message: NestWhatsMessage,
		@Args() prefix: string,
	) {
		// Read per message rather than captured at boot, so this takes effect on
		// the next one with no reconnect.
		this.registry.updatePrefix("personal", prefix);
		await message.reply(`prefix is now "${prefix}"`);
	}
}
