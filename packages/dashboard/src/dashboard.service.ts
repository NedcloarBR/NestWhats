import { IncomingMessage, Server, ServerResponse, createServer } from "node:http";
import {
	Inject,
	Injectable,
	Logger,
	OnApplicationShutdown,
	OnModuleInit,
} from "@nestjs/common";
import { ClientsRegistryService } from "nestwhats";
import type { NestWhatsDashboardOptions } from "./dashboard-options.interface";
import { DASHBOARD_OPTIONS } from "./dashboard.constants";
import { getDashboardHtml } from "./dashboard.html";

@Injectable()
export class DashboardService implements OnModuleInit, OnApplicationShutdown {
	private readonly logger = new Logger("NestWhatsDashboard");
	private server: Server | undefined;
	private readonly sseClients = new Set<ServerResponse>();
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
				res.end(getDashboardHtml());
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
