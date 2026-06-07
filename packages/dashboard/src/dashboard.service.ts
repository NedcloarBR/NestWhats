import { randomUUID } from "node:crypto";
import {
	IncomingMessage,
	Server,
	ServerResponse,
	createServer,
} from "node:http";
import {
	Inject,
	Injectable,
	Logger,
	OnApplicationShutdown,
	OnModuleInit,
} from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { ClientStatus, ClientsRegistryService } from "nestwhats";
import type {
	NestWhatsDashboardOptions,
	WebhookServicePort,
} from "./dashboard-options.interface";
import {
	DASHBOARD_OPTIONS,
	WEBHOOK_SERVICE_TOKEN,
} from "./dashboard.constants";
import { getDashboardHtml, getLoginHtml } from "./dashboard.html";

@Injectable()
export class DashboardService implements OnModuleInit, OnApplicationShutdown {
	private readonly logger = new Logger("NestWhatsDashboard");
	private server: Server | undefined;
	private readonly sseClients = new Set<ServerResponse>();
	private readonly actionToken = randomUUID();
	private unsubscribeRegistry?: () => void;
	private unsubscribeWebhook?: () => void;
	private readonly sessions = new Set<string>();

	private webhookService?: WebhookServicePort;

	public constructor(
		@Inject(DASHBOARD_OPTIONS)
		private readonly options: NestWhatsDashboardOptions,
		private readonly clientsRegistry: ClientsRegistryService,
		private readonly moduleRef: ModuleRef,
	) {}

	public onModuleInit(): void {
		if (this.options.webhook) {
			try {
				this.webhookService = this.moduleRef.get<WebhookServicePort>(
					WEBHOOK_SERVICE_TOKEN,
					{ strict: false },
				);
			} catch {
				this.logger.warn(
					"webhook: true is set but NestWhatsMessagingModule is not imported — webhook controls will be hidden",
				);
			}
		}

		const port = this.options.port ?? 4000;
		const path = this.options.path ?? "nestwhats";

		this.unsubscribeRegistry = this.clientsRegistry.subscribe(() =>
			this.broadcastSse(),
		);

		if (this.webhookService) {
			this.unsubscribeWebhook = this.webhookService.subscribe(() =>
				this.broadcastSse(),
			);
		}

		this.server = createServer((req, res) => {
			const url = req.url ?? "/";

			if (
				req.method === "POST" &&
				(url === `/${path}/auth` || url === "/auth")
			) {
				const chunks: Buffer[] = [];
				req.on("data", (chunk: Buffer) => chunks.push(chunk));
				req.on("end", () => {
					this.handleLogin(Buffer.concat(chunks).toString(), res);
				});
				return;
			}

			if ([`/${path}`, `/${path}/`].includes(url)) {
				if (this.options.auth && !this.checkAuth(req)) {
					res.writeHead(200, { "Content-Type": "text/html" });
					res.end(getLoginHtml(path));
					return;
				}
				res.writeHead(200, { "Content-Type": "text/html" });
				res.end(getDashboardHtml(this.actionToken, this.hasWebhook));
				return;
			}

			if (!this.checkAuth(req)) {
				res.writeHead(401, { "Content-Type": "text/plain" });
				res.end("Unauthorized");
				return;
			}

			if (url === `/${path}/api/clients` || url === "/api/clients") {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(this.buildPayload()));
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
				res.write(`data: ${JSON.stringify(this.buildPayload())}\n\n`);

				this.sseClients.add(res);

				const keepAlive = setInterval(() => res.write(": ping\n\n"), 30_000);
				req.on("close", () => {
					clearInterval(keepAlive);
					this.sseClients.delete(res);
				});
				return;
			}

			const actionMatch =
				req.method === "POST"
					? url.match(new RegExp(`^(?:/${path})?/api/clients/([^/]+)/action$`))
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
					void this.handleAction(name, Buffer.concat(chunks).toString(), res);
				});
				return;
			}

			const virtualCreateMatch =
				req.method === "POST" &&
				(url === `/${path}/api/virtual-clients` ||
					url === "/api/virtual-clients");

			if (virtualCreateMatch) {
				if (req.headers["x-action-token"] !== this.actionToken) {
					res.writeHead(403, { "Content-Type": "text/plain" });
					res.end("Forbidden");
					return;
				}
				const chunks: Buffer[] = [];
				req.on("data", (chunk: Buffer) => chunks.push(chunk));
				req.on("end", () => {
					void this.handleVirtualClientCreate(
						Buffer.concat(chunks).toString(),
						res,
					);
				});
				return;
			}

			const virtualDeleteMatch =
				req.method === "DELETE"
					? url.match(new RegExp(`^(?:/${path})?/api/virtual-clients/([^/]+)$`))
					: null;

			if (virtualDeleteMatch) {
				if (req.headers["x-action-token"] !== this.actionToken) {
					res.writeHead(403, { "Content-Type": "text/plain" });
					res.end("Forbidden");
					return;
				}
				const name = decodeURIComponent(virtualDeleteMatch[1]);
				void this.handleVirtualClientDestroy(name, res);
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

	private async handleVirtualClientCreate(
		rawBody: string,
		res: ServerResponse,
	): Promise<void> {
		if (!this.webhookService) {
			res.writeHead(400, { "Content-Type": "text/plain" });
			res.end("Messaging module not configured");
			return;
		}
		let body: { name: string; prefix?: string };
		try {
			body = JSON.parse(rawBody) as typeof body;
		} catch {
			res.writeHead(400, { "Content-Type": "text/plain" });
			res.end("Invalid body");
			return;
		}
		try {
			await this.webhookService.addVirtualClient({
				name: body.name,
				prefix: body.prefix,
			});
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ ok: true }));
		} catch (err: unknown) {
			this.logger.error(
				`Create virtual client "${body.name}" failed: ${err instanceof Error ? err.message : String(err)}`,
			);
			res.writeHead(500, { "Content-Type": "text/plain" });
			res.end("Action failed");
		}
	}

	private async handleVirtualClientDestroy(
		name: string,
		res: ServerResponse,
	): Promise<void> {
		if (!this.webhookService) {
			res.writeHead(400, { "Content-Type": "text/plain" });
			res.end("Messaging module not configured");
			return;
		}
		try {
			await this.webhookService.removeVirtualClient(name);
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ ok: true }));
		} catch (err: unknown) {
			this.logger.error(
				`Destroy virtual client "${name}" failed: ${err instanceof Error ? err.message : String(err)}`,
			);
			res.writeHead(500, { "Content-Type": "text/plain" });
			res.end("Action failed");
		}
	}

	private async handleAction(
		name: string,
		rawBody: string,
		res: ServerResponse,
	): Promise<void> {
		let body: {
			action: string;
			handler?: string;
			bound?: boolean;
		};
		try {
			body = JSON.parse(rawBody) as typeof body;
		} catch {
			res.writeHead(400, { "Content-Type": "text/plain" });
			res.end("Invalid body");
			return;
		}
		const { action } = body;

		try {
			const entry = this.clientsRegistry.getEntry(name);
			if (!entry) {
				res.writeHead(404, { "Content-Type": "text/plain" });
				res.end("Client not found");
				return;
			}

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
			} else if (action === "webhook-toggle" && body.handler) {
				if (body.bound) {
					this.webhookService?.register({
						client: name,
						handlers: [body.handler],
					});
				} else {
					this.webhookService?.unregister({
						client: name,
						handlers: [body.handler],
					});
				}
				this.broadcastSse();
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

	private handleLogin(rawBody: string, res: ServerResponse): void {
		if (!this.options.auth) {
			res.writeHead(400, { "Content-Type": "text/plain" });
			res.end("Auth not configured");
			return;
		}

		let username: string;
		let password: string;
		try {
			({ username, password } = JSON.parse(rawBody) as {
				username: string;
				password: string;
			});
		} catch {
			res.writeHead(400, { "Content-Type": "text/plain" });
			res.end("Invalid body");
			return;
		}

		if (
			username !== this.options.auth.username ||
			password !== this.options.auth.password
		) {
			res.writeHead(401, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ ok: false, error: "Invalid credentials" }));
			return;
		}

		const token = randomUUID();
		this.sessions.add(token);
		res.writeHead(200, {
			"Content-Type": "application/json",
			"Set-Cookie": `session=${token}; Path=/; HttpOnly; SameSite=Strict`,
		});
		res.end(JSON.stringify({ ok: true }));
	}

	private get hasWebhook(): boolean {
		return !!this.options.webhook && !!this.webhookService;
	}

	private buildPayload() {
		const availableHandlers = this.hasWebhook
			? this.webhookService?.getHandlers()
			: null;
		return this.clientsRegistry.getSummary().map((c) => ({
			...c,
			webhookAvailableHandlers: availableHandlers,
			webhookBoundHandlers: this.hasWebhook
				? this.webhookService?.getBoundHandlers({ client: c.name })
				: null,
		}));
	}

	private broadcastSse(): void {
		const payload = `data: ${JSON.stringify(this.buildPayload())}\n\n`;
		for (const res of this.sseClients) res.write(payload);
	}

	public onApplicationShutdown(): Promise<void> {
		this.unsubscribeRegistry?.();
		this.unsubscribeWebhook?.();
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
		const token = (req.headers.cookie ?? "").match(
			/(?:^|;)\s*session=([^;]+)/,
		)?.[1];
		return !!token && this.sessions.has(token);
	}
}
