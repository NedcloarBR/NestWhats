import { Global, Module, OnModuleInit } from "@nestjs/common";
import { ExplorerService } from "../nestwhats-explorer.service";
import { Listener } from "./decorators";
import { ListenerRegistryService } from "./listener-registry.service";
import { ListenerDiscovery } from "./listener.discovery";

@Global()
@Module({
	providers: [ListenerRegistryService],
	exports: [ListenerRegistryService],
})
export class ListenersModule implements OnModuleInit {
	public constructor(
		private readonly explorerService: ExplorerService<ListenerDiscovery>,
		private readonly listenerRegistry: ListenerRegistryService,
	) {}

	public onModuleInit() {
		const listeners = this.explorerService.explore(Listener.KEY);
		this.listenerRegistry.set(listeners);
	}
}
