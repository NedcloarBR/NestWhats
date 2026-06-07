import { Injectable } from "@nestjs/common";
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { DiscoveryService, MetadataScanner, Reflector } from "@nestjs/core";
import { ExternalContextCreator } from "@nestjs/core/helpers/external-context-creator";
import { ParamMetadata } from "@nestjs/core/helpers/interfaces";
import { STATIC_CONTEXT } from "@nestjs/core/injector/constants";
import { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";
import { CommandDiscovery } from "./commands/command.discovery";
import {
	COMMAND_GROUP_KEY,
	CommandGroupMeta,
} from "./commands/decorators/command-group.decorator";
import {
	SubcommandDiscovery,
	SubcommandMeta,
} from "./commands/subcommand.discovery";
import {
	NestWhatsBaseDiscovery,
	NestWhatsContextType,
	NestWhatsParamsFactory,
} from "./context";

@Injectable()
export class ExplorerService<
	T extends NestWhatsBaseDiscovery,
> extends Reflector {
	private readonly moduleParamsFactory = new NestWhatsParamsFactory();

	public constructor(
		private readonly discoveryService: DiscoveryService,
		private readonly externalContextCreator: ExternalContextCreator,
		private readonly metadataScanner: MetadataScanner,
	) {
		super();
	}

	public explore(metadataKey: string): T[] {
		const wrappers = this.discoveryService.getProviders().filter((wrapper) => {
			const { instance } = wrapper;
			const prototype = instance ? Object.getPrototypeOf(instance) : null;
			return instance && prototype && wrapper.isDependencyTreeStatic();
		});

		return wrappers
			.flatMap((wrapper) => this.filterProperties(wrapper, metadataKey))
			.filter((item): item is T => !!item);
	}

	private filterProperties({ instance }: InstanceWrapper, metadataKey: string) {
		const prototype = Object.getPrototypeOf(instance);

		return this.metadataScanner
			.getAllMethodNames(prototype)
			.map((methodName) => {
				const item = this.get<T>(metadataKey, instance[methodName]);

				if (!item) return;

				item.setDiscoveryMeta({
					class: instance.constructor,
					handler: instance[methodName],
				});
				item.setContextCallback(
					this.createContextCallback(instance, prototype, methodName),
				);

				return item;
			});
	}

	public exploreCommandGroups(
		subcommandKey: string | symbol,
		defaultKey: string | symbol,
	): { commands: CommandDiscovery[]; subcommands: SubcommandDiscovery[] } {
		const commands: CommandDiscovery[] = [];
		const subcommands: SubcommandDiscovery[] = [];

		const wrappers = this.discoveryService.getProviders().filter((w) => {
			const { instance } = w;
			const prototype = instance ? Object.getPrototypeOf(instance) : null;
			return instance && prototype && w.isDependencyTreeStatic();
		});

		for (const wrapper of wrappers) {
			const { instance } = wrapper;
			const groupMeta = this.get<CommandGroupMeta>(
				COMMAND_GROUP_KEY,
				instance.constructor,
			);
			if (!groupMeta) continue;

			const prototype = Object.getPrototypeOf(instance);

			for (const methodName of this.metadataScanner.getAllMethodNames(
				prototype,
			)) {
				const subMeta = this.get<SubcommandMeta>(
					subcommandKey,
					instance[methodName],
				);
				if (subMeta) {
					const sub = new SubcommandDiscovery({
						...subMeta,
						parent: groupMeta.name,
					});
					sub.setDiscoveryMeta({
						class: instance.constructor,
						handler: instance[methodName],
					});
					sub.setContextCallback(
						this.createContextCallback(instance, prototype, methodName),
					);
					subcommands.push(sub);
				}

				const isDefault = this.get(defaultKey, instance[methodName]);
				if (isDefault !== undefined) {
					const cmd = new CommandDiscovery({
						name: groupMeta.name,
						description: groupMeta.description,
						client: groupMeta.client,
					});
					cmd.setDiscoveryMeta({
						class: instance.constructor,
						handler: instance[methodName],
					});
					cmd.setContextCallback(
						this.createContextCallback(instance, prototype, methodName),
					);
					commands.push(cmd);
				}
			}
		}

		return { commands, subcommands };
	}

	private createContextCallback(
		instance: object,
		prototype: Record<string, (...args: any[]) => any>,
		methodName: string,
	) {
		return this.externalContextCreator.create<
			Record<number, ParamMetadata>,
			NestWhatsContextType
		>(
			instance,
			prototype[methodName],
			methodName,
			ROUTE_ARGS_METADATA,
			this.moduleParamsFactory,
			STATIC_CONTEXT,
			undefined,
			{ guards: true, filters: true, interceptors: true },
			"nestwhats",
		);
	}
}
