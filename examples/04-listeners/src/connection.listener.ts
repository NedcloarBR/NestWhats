import { Injectable, Logger } from "@nestjs/common";
import { Context, ContextOf, isTerminalDisconnect, On, Once } from "nestwhats";

/**
 * The five derived events. The core works these out from the adapter's raw
 * `connectionUpdate`, and fires the status ones only on a real transition —
 * platforms repeat their state on every reconnect, and a second `ready` would
 * defeat `@Once`.
 */
@Injectable()
export class ConnectionListener {
	private readonly logger = new Logger(ConnectionListener.name);

	@Once("qr")
	public onFirstQr(@Context() [client, qr]: ContextOf<"qr">) {
		this.logger.log(`Scan this to connect ${client.name}: ${qr}`);
	}

	@On("pairingCode")
	public onPairingCode(@Context() [, code]: ContextOf<"pairingCode">) {
		this.logger.log(`Type this on the phone: ${code}`);
	}

	@On("authenticated")
	public onAuthenticated(@Context() [client]: ContextOf<"authenticated">) {
		this.logger.log(`${client.name}: credentials accepted, not usable yet`);
	}

	@On("ready")
	public onReady(@Context() [client]: ContextOf<"ready">) {
		this.logger.log(`${client.name} is online as ${client.getInfo()?.phone}`);
	}

	@On("disconnected")
	public onDisconnected(
		@Context() [client, reason]: ContextOf<"disconnected">,
	) {
		// Terminal means one thing: only authenticating again can help, so there
		// is no point waiting for a reconnect that is not coming.
		if (isTerminalDisconnect(reason)) {
			this.logger.error(`${client.name} needs a new QR: ${reason?.message}`);
			return;
		}
		this.logger.warn(`${client.name} dropped (${reason?.kind}), retrying`);
	}
}
