import { randomUUID } from "node:crypto";
import {
	createServer,
	IncomingMessage,
	Server,
	ServerResponse,
} from "node:http";
import {
	Inject,
	Injectable,
	Logger,
	OnApplicationShutdown,
	OnModuleInit,
} from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import {
	ClientStatus,
	ClientsRegistryService,
	type NestWhatsAdapter,
} from "nestwhats";
import { toDataURL } from "qrcode";
import {
	CLIENT_MANAGER_TOKEN,
	DASHBOARD_OPTIONS,
	WEBHOOK_SERVICE_TOKEN,
} from "./dashboard.constants.js";
import { getDashboardHtml, getLoginHtml } from "./dashboard.html.js";
import type {
	ClientManagerPort,
	NestWhatsDashboardOptions,
	WebhookServicePort,
} from "./dashboard-options.interface.js";

/**
 * What an adapter that pairs by passkey exposes, by shape. The dashboard
 * checks the method rather than the class, so it depends on no platform
 * package.
 */
type PasskeyCapableAdapter = NestWhatsAdapter & {
	resolvePasskey?(assertion: unknown): void;
	rejectPasskey?(reason?: unknown): void;
};

/**
 * The dashboard's HTTP server: serves the page, streams client state over SSE,
 * and handles the actions the page posts back.
 *
 * Runs its own `node:http` server on its own port rather than mounting on the
 * application's, so it works the same whether the app is Express, Fastify or
 * has no HTTP adapter at all.
 */
@Injectable()
export class DashboardService implements OnModuleInit, OnApplicationShutdown {
	private readonly logger = new Logger("NestWhatsDashboard");
	private server: Server | undefined;
	private readonly sseClients = new Set<ServerResponse>();
	private readonly actionToken = randomUUID();
	private unsubscribeRegistry?: () => void;
	private unsubscribeWebhook?: () => void;
	/** Rendered QR images, keyed by client — the registry stores the raw payload. */
	private readonly qrImages = new Map<string, { raw: string; image: string }>();
	/**
	 * Passkey challenges waiting for the page, keyed by client.
	 *
	 * A passkey is not part of the core's connection contract — only a socket
	 * platform has it — so it does not travel through the registry the way a
	 * QR does. The dashboard listens on the adapter instead, for any adapter
	 * that announces the `passkeyChallenge` event, and never names a platform.
	 */
	private readonly passkeyChallenges = new Map<string, unknown>();
	private readonly passkeyResults = new Map<
		string,
		{ ok: boolean; error?: string; at: number }
	>();
	private readonly passkeyListeners = new Map<string, () => void>();
	private readonly sessions = new Set<string>();

	private webhookService?: WebhookServicePort;
	private clientManager?: ClientManagerPort;

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
					"webhook: true is set but NestWhatsWebhookModule is not imported — webhook controls will be hidden",
				);
			}
		}

		try {
			this.clientManager = this.moduleRef.get<ClientManagerPort>(
				CLIENT_MANAGER_TOKEN,
				{ strict: false },
			);
		} catch {
			// NestWhatsClientManagerService not available
		}

		const port = this.options.port ?? 4000;
		const path = this.options.path ?? "nestwhats";

		this.unsubscribeRegistry = this.clientsRegistry.subscribe(() => {
			this.syncPasskeyListeners();
			void this.renderPendingQrCodes();
			this.broadcastSse();
		});
		this.syncPasskeyListeners();

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
				res.end(
					getDashboardHtml(
						this.actionToken,
						this.hasWebhook,
						!!this.clientManager,
						this.clientManager?.getRegisteredAdapters() ?? [],
					),
				);
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

			const virtualUpdateMatch =
				req.method === "PATCH"
					? url.match(new RegExp(`^(?:/${path})?/api/virtual-clients/([^/]+)$`))
					: null;

			if (virtualUpdateMatch) {
				if (req.headers["x-action-token"] !== this.actionToken) {
					res.writeHead(403, { "Content-Type": "text/plain" });
					res.end("Forbidden");
					return;
				}
				const name = decodeURIComponent(virtualUpdateMatch[1]);
				const chunks: Buffer[] = [];
				req.on("data", (chunk: Buffer) => chunks.push(chunk));
				req.on("end", () => {
					void this.handleVirtualClientUpdate(
						name,
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

		this.server.on("error", (err: NodeJS.ErrnoException) => {
			if (err.code === "EADDRINUSE") {
				this.logger.error(
					`Port ${port} is already in use — dashboard not started (set a different port in NestWhatsDashboardModule.forRoot)`,
				);
				return;
			}
			this.logger.error(`Dashboard server error: ${err.message}`);
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
		if (!this.clientManager) {
			res.writeHead(400, { "Content-Type": "text/plain" });
			res.end("Client manager not available");
			return;
		}
		let body: {
			name: string;
			adapter?: string;
			options?: Record<string, unknown>;
			prefix?: string;
		};
		try {
			body = JSON.parse(rawBody) as typeof body;
		} catch {
			res.writeHead(400, { "Content-Type": "text/plain" });
			res.end("Invalid body");
			return;
		}

		if (!body.name?.trim()) {
			res.writeHead(400, { "Content-Type": "text/plain" });
			res.end("Name is required");
			return;
		}

		const known = this.clientManager.getRegisteredAdapters().map((a) => a.name);
		if (body.adapter && !known.includes(body.adapter)) {
			res.writeHead(400, { "Content-Type": "text/plain" });
			res.end(
				`Unknown adapter "${body.adapter}" — registered: ${known.join(", ") || "none"}`,
			);
			return;
		}
		try {
			await this.clientManager.createClient({
				name: body.name,
				adapter: body.adapter,
				options: body.options,
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

	private async handleVirtualClientUpdate(
		name: string,
		rawBody: string,
		res: ServerResponse,
	): Promise<void> {
		if (!this.clientManager) {
			res.writeHead(400, { "Content-Type": "text/plain" });
			res.end("Client manager not available");
			return;
		}

		let body: { prefix?: string; options?: Record<string, unknown> };
		try {
			body = JSON.parse(rawBody) as typeof body;
		} catch {
			res.writeHead(400, { "Content-Type": "text/plain" });
			res.end("Invalid body");
			return;
		}

		const entry = this.clientsRegistry.getEntry(name);
		if (!entry) {
			res.writeHead(404, { "Content-Type": "text/plain" });
			res.end("Client not found");
			return;
		}
		if (!entry.virtual) {
			res.writeHead(409, { "Content-Type": "text/plain" });
			res.end(
				`Client "${name}" is not a virtual client — clients declared in forRoot are configured in code`,
			);
			return;
		}

		try {
			await this.clientManager.updateClient(name, body);
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ ok: true }));
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			this.logger.error(`Update virtual client "${name}" failed: ${message}`);
			res.writeHead(500, { "Content-Type": "text/plain" });
			res.end(message);
		}
	}

	private async handleVirtualClientDestroy(
		name: string,
		res: ServerResponse,
	): Promise<void> {
		if (!this.clientManager) {
			res.writeHead(400, { "Content-Type": "text/plain" });
			res.end("Client manager not available");
			return;
		}

		const entry = this.clientsRegistry.getEntry(name);
		if (!entry) {
			res.writeHead(404, { "Content-Type": "text/plain" });
			res.end("Client not found");
			return;
		}
		if (!entry.virtual) {
			res.writeHead(409, { "Content-Type": "text/plain" });
			res.end(
				`Client "${name}" is not a virtual client — module clients cannot be destroyed at runtime`,
			);
			return;
		}

		try {
			await this.clientManager.destroyClient(name);
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
			assertion?: unknown;
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

			if (action === "passkey") {
				const adapter = entry.adapter as PasskeyCapableAdapter;
				if (typeof adapter.resolvePasskey !== "function" || !body.assertion) {
					res.writeHead(400, { "Content-Type": "text/plain" });
					res.end("This client is not waiting for a passkey");
					return;
				}
				adapter.resolvePasskey(body.assertion);
				this.passkeyChallenges.delete(name);
				this.broadcastSse();
			} else if (action === "passkey-cancel") {
				(entry.adapter as PasskeyCapableAdapter).rejectPasskey?.(
					new Error("Cancelled from the dashboard"),
				);
				this.passkeyChallenges.delete(name);
				this.broadcastSse();
			} else if (action === "logout") {
				await entry.adapter.logout?.();
			} else if (action === "restart") {
				await entry.adapter.destroy();
				this.clientsRegistry.updateStatus(name, ClientStatus.Initializing);
				entry.adapter.initialize().catch((err: unknown) => {
					this.logger.error(
						`[${name}] Restart failed: ${err instanceof Error ? err.message : String(err)}`,
					);
				});
			} else if (action === "force-qr") {
				await entry.adapter.logout?.();
				this.clientsRegistry.updateStatus(name, ClientStatus.Initializing);
				entry.adapter.initialize().catch((err: unknown) => {
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

	/**
	 * Attaches to every adapter that emits passkey challenges, and lets go of
	 * the ones whose client is gone. Runs on every registry change, since that
	 * is when clients appear and disappear.
	 */
	private syncPasskeyListeners(): void {
		const live = new Set<string>();
		for (const { name } of this.clientsRegistry.getSummary()) {
			live.add(name);
			if (this.passkeyListeners.has(name)) continue;
			const adapter = this.clientsRegistry.getEntry(name)?.adapter;
			if (!adapter?.supportedEvents?.has("passkeyChallenge")) continue;

			const onChallenge = (challenge: { requestOptions: unknown }) => {
				this.passkeyChallenges.set(name, challenge.requestOptions);
				this.passkeyResults.delete(name);
				this.broadcastSse();
			};
			const onResult = (result: { ok: boolean; error?: string }) => {
				this.passkeyChallenges.delete(name);
				this.passkeyResults.set(name, { ...result, at: Date.now() });
				this.broadcastSse();
			};
			adapter.on("passkeyChallenge", onChallenge);
			adapter.on("passkeyResult", onResult);
			this.passkeyListeners.set(name, () => {
				adapter.off("passkeyChallenge", onChallenge);
				adapter.off("passkeyResult", onResult);
			});
		}
		for (const [name, detach] of this.passkeyListeners) {
			if (live.has(name)) continue;
			detach();
			this.passkeyListeners.delete(name);
			this.passkeyChallenges.delete(name);
			this.passkeyResults.delete(name);
		}
	}

	private get hasWebhook(): boolean {
		return !!this.options.webhook && !!this.webhookService;
	}

	/**
	 * Turns raw QR payloads into data URLs the page can render. The core no
	 * longer does this: rendering is the concern of whoever displays it, and a
	 * platform without QR authentication never reaches this path.
	 */
	private async renderPendingQrCodes(): Promise<void> {
		let rendered = false;
		const live = new Set<string>();

		for (const client of this.clientsRegistry.getSummary()) {
			live.add(client.name);
			const qr = client.qr;
			if (!qr) {
				this.qrImages.delete(client.name);
				continue;
			}
			if (this.qrImages.get(client.name)?.raw === qr) continue;
			try {
				this.qrImages.set(client.name, { raw: qr, image: await toDataURL(qr) });
				rendered = true;
			} catch (err: unknown) {
				this.logger.warn(
					`[${client.name}] Could not render QR code: ${err instanceof Error ? err.message : String(err)}`,
				);
			}
		}

		for (const name of this.qrImages.keys()) {
			if (!live.has(name)) this.qrImages.delete(name);
		}

		if (rendered) this.broadcastSse();
	}

	private buildPayload() {
		const persistedByName = new Map(
			(this.clientManager?.getPersistedVirtualClients() ?? []).map((c) => [
				c.name,
				c,
			]),
		);
		const availableHandlers = this.hasWebhook
			? this.webhookService?.getHandlers()
			: null;
		return this.clientsRegistry.getSummary().map(({ info, ...c }) => ({
			...c,
			qr: c.qr ? this.qrImages.get(c.name)?.image : undefined,
			passkeyChallenge: this.passkeyChallenges.get(c.name),
			passkeyResult: this.passkeyResults.get(c.name),
			displayName: info?.displayName,
			phone: info?.phone,
			config: persistedByName.get(c.name),
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
		for (const detach of this.passkeyListeners.values()) detach();
		this.passkeyListeners.clear();
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
