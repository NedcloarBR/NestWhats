import { Global, Module, OnModuleInit } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { Client } from "whatsapp-web.js";
import { ExplorerService } from "../nestwhats-explorer.service";
import { Listener } from "./decorators";
import { ListenerDiscovery } from "./listener.discovery";

@Global()
@Module({
	imports: [DiscoveryModule],
})
export class ListenersModule implements OnModuleInit {
	public constructor(
		private readonly client: Client,
		private readonly explorerService: ExplorerService<ListenerDiscovery>,
	) {}

	public onModuleInit() {
		return this.explorerService
			.explore(Listener.KEY)
			.forEach((listener) =>
				this.client[listener.getType()](listener.getEvent(), (...args) =>
					listener.execute(args),
				),
			);
	}
}
