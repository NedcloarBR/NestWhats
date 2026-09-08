import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import type { NestWhatsClient } from "../client/client.js";
import type { NestWhatsMessage } from "../structures/index.js";
import type { CommandDiscovery } from "./command.discovery.js";
import { CommandsRegistryService } from "./commands-registry.service.js";
import type { SubcommandDiscovery } from "./subcommand.discovery.js";

/**
 * Turns an incoming message into a handler call: matches the prefix, resolves
 * the command or subcommand, and runs it through the guards, pipes and filters
 * declared on it.
 */
@Injectable()
export class CommandsService {
	private readonly logger = new Logger(CommandsService.name);

	public constructor(private readonly registry: CommandsRegistryService) {}

	/**
	 * Runs a handler, treating a guard's refusal as a decision rather than a
	 * failure.
	 *
	 * Nest turns `canActivate` returning false into a `ForbiddenException`,
	 * which is right for HTTP and wrong here: a command declining to run in a
	 * DM, or on a platform without the capability it needs, is ordinary flow
	 * and must not reach the caller as an error to log. A `@UseFilters()`
	 * declared on the handler still sees it first — this only catches what
	 * nothing else wanted.
	 */
	private async run(
		discovery: CommandDiscovery | SubcommandDiscovery,
		message: NestWhatsMessage,
		client?: NestWhatsClient,
	): Promise<void> {
		try {
			await discovery.execute([message], client);
		} catch (err: unknown) {
			if (!(err instanceof ForbiddenException)) throw err;
			this.logger.verbose(
				`Command "${message.body.split(/ +/)[0]}" was denied by a guard`,
			);
		}
	}

	public async handle(
		message: NestWhatsMessage,
		clientName: string,
		prefix: string,
		client?: NestWhatsClient,
	): Promise<void> {
		if (!message?.body?.length) return;

		const lowered = message.body.toLowerCase();

		if (prefix && lowered.startsWith(prefix.toLowerCase())) {
			const dispatched = await this.dispatch(
				message,
				prefix.length,
				clientName,
				(cmd) => this.registry.get(cmd),
				client,
			);
			if (dispatched) return;
		}

		for (const [customPrefix, commands] of this.registry.prefixCache) {
			if (!lowered.startsWith(customPrefix.toLowerCase())) continue;

			const dispatched = await this.dispatch(
				message,
				customPrefix.length,
				clientName,
				(cmd) => commands.get(cmd),
				client,
			);
			if (dispatched) return;
		}
	}

	private async dispatch(
		message: NestWhatsMessage,
		prefixLength: number,
		clientName: string,
		lookup: (cmd: string) => CommandDiscovery | undefined,
		client?: NestWhatsClient,
	): Promise<boolean> {
		const tokens = message.body.substring(prefixLength).split(/ +/g);
		const cmd = tokens.shift()?.toLowerCase();
		if (!cmd) return false;

		const sub = tokens[0] ? this.registry.getSub(cmd, tokens[0]) : undefined;
		if (sub && this.allowsClient(sub, clientName)) {
			await this.run(sub, message, client);
			return true;
		}

		const command = lookup(cmd);
		if (command && this.allowsClient(command, clientName)) {
			await this.run(command, message, client);
			return true;
		}

		return false;
	}

	private allowsClient(
		discovery: CommandDiscovery | SubcommandDiscovery,
		clientName: string,
	): boolean {
		const clients = discovery.getClients();
		return !clients || clients.includes(clientName);
	}
}
