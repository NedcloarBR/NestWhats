import { randomUUID } from "node:crypto";
import { IncomingMessage, Server, ServerResponse, createServer } from "node:http";
import {
	Inject,
	Injectable,
	Logger,
	OnApplicationShutdown,
	OnModuleInit,
} from "@nestjs/common";
import { ClientStatus, ClientsRegistryService } from "nestwhats";
import type { NestWhatsDashboardOptions } from "./dashboard-options.interface";
import { DASHBOARD_OPTIONS } from "./dashboard.constants";
import { getDashboardHtml } from "./dashboard.html";

@Injectable()
export class DashboardService implements OnModuleInit, OnApplicationShutdown {
	private readonly logger = new Logger("NestWhatsDashboard");
	private server: Server | undefined;
	private readonly sseClients = new Set<ServerResponse>();
	private readonly actionToken = randomUUID();
	private unsubscribeRegistry?: () => void;

	public constructor(
		@Inject(DASHBOARD_OPTIONS)
		private readonly options: NestWhatsDashboardOptions,
		private readonly clientsRegistry: ClientsRegistryService,
	) {}

	public onModuleInit(): void {
		const port = this.options.port ?? 4000;
		const path = this.options.path ?? "nestwhats";

		this.unsubscribeRegistry = this.clientsRegistry.subscribe(() =>
			this.broadcastSse(),
		);

		this.server = createServer((req, res) => {
			if (!this.checkAuth(req)) {
				res.writeHead(401, {
					"WWW-Authenticate": 'Basic realm="NestWhats Dashboard"',
					"Content-Type": "text/plain",
				});
				res.end("Unauthorized");
				return;
			}

			const url = req.url ?? "/";

			if (url === `/${path}/api/clients` || url === "/api/clients") {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(this.clientsRegistry.getSummary()));
				return;
			}

			if (url === `/${path}/events` || url === "/events") {
				res.writeHead(200, {
					"Content-Type": "text/event-stream",
					"Cache-Control": "no-cache",
					Connection: "keep-alive",
					"X-Accel-Buffering": "no",
				});
				res.write(": connected\n\n");
				res.write(
					`data: ${JSON.stringify(this.clientsRegistry.getSummary())}\n\n`,
				);

				this.sseClients.add(res);

				const keepAlive = setInterval(() => res.write(": ping\n\n"), 30_000);
				req.on("close", () => {
					clearInterval(keepAlive);
					this.sseClients.delete(res);
				});
				return;
			}

			if ([`/${path}`, `/${path}/`].includes(url)) {
				res.writeHead(200, { "Content-Type": "text/html" });
				res.end(getDashboardHtml(this.actionToken));
				return;
			}

			const actionMatch =
				req.method === "POST"
					? url.match(
							new RegExp(
								`^(?:/${path})?/api/clients/([^/]+)/action$`,
							),
						)
					: null;

			if (actionMatch) {
				if (req.headers["x-action-token"] !== this.actionToken) {
					res.writeHead(403, { "Content-Type": "text/plain" });
					res.end("Forbidden");
					return;
				}
				const name = decodeURIComponent(actionMatch[1]);
				const chunks: Buffer[] = [];
				req.on("data", (chunk: Buffer) => chunks.push(chunk));
				req.on("end", () => {
					void this.handleAction(
						name,
						Buffer.concat(chunks).toString(),
						res,
					);
				});
				return;
			}

			res.writeHead(404, { "Content-Type": "text/plain" });
			res.end("Not found");
		});

		this.server.listen(port, () => {
			this.logger.log(
				`Dashboard available at http://localhost:${port}/${path}`,
			);
		});
	}

	private async handleAction(
		name: string,
		rawBody: string,
		res: ServerResponse,
	): Promise<void> {
		const entry = this.clientsRegistry.getEntry(name);
		if (!entry) {
			res.writeHead(404, { "Content-Type": "text/plain" });
			res.end("Client not found");
			return;
		}

		let action: string;
		try {
			({ action } = JSON.parse(rawBody) as { action: string });
		} catch {
			res.writeHead(400, { "Content-Type": "text/plain" });
			res.end("Invalid body");
			return;
		}

		try {
			if (action === "logout") {
				await entry.client.logout();
			} else if (action === "restart") {
				await entry.client.destroy();
				this.clientsRegistry.updateStatus(name, ClientStatus.Initializing);
				entry.client.initialize().catch((err: unknown) => {
					this.logger.error(
						`[${name}] Restart failed: ${err instanceof Error ? err.message : String(err)}`,
					);
				});
			} else if (action === "force-qr") {
				await entry.client.logout();
				this.clientsRegistry.updateStatus(name, ClientStatus.Initializing);
				entry.client.initialize().catch((err: unknown) => {
					this.logger.error(
						`[${name}] Force QR failed: ${err instanceof Error ? err.message : String(err)}`,
					);
				});
			} else {
				res.writeHead(400, { "Content-Type": "text/plain" });
				res.end("Unknown action");
				return;
			}
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ ok: true }));
		} catch (err: unknown) {
			this.logger.error(
				`Action "${action}" on "${name}" failed: ${err instanceof Error ? err.message : String(err)}`,
			);
			res.writeHead(500, { "Content-Type": "text/plain" });
			res.end("Action failed");
		}
	}

	private broadcastSse(): void {
		const payload = `data: ${JSON.stringify(this.clientsRegistry.getSummary())}\n\n`;
		for (const res of this.sseClients) res.write(payload);
	}

	public onApplicationShutdown(): Promise<void> {
		this.unsubscribeRegistry?.();
		for (const res of this.sseClients) res.end();
		this.sseClients.clear();

		return new Promise((resolve) => {
			if (!this.server) {
				resolve();
				return;
			}
			this.logger.log("Closing dashboard server…");
			this.server.close(() => {
				this.logger.log("Dashboard server closed");
				resolve();
			});
		});
	}

	private checkAuth(req: IncomingMessage): boolean {
		if (!this.options.auth) return true;

		const authorization = req.headers.authorization ?? "";
		if (!authorization.startsWith("Basic ")) return false;

		const decoded = Buffer.from(authorization.slice(6), "base64").toString(
			"utf-8",
		);
		const [username, ...rest] = decoded.split(":");
		const password = rest.join(":");

		return (
			username === this.options.auth.username &&
			password === this.options.auth.password
		);
	}
}
