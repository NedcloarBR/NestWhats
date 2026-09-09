import { Injectable, Logger } from "@nestjs/common";
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants.js";
import { DiscoveryService, MetadataScanner, Reflector } from "@nestjs/core";
import { ExternalContextCreator } from "@nestjs/core/helpers/external-context-creator.js";
import { ParamMetadata } from "@nestjs/core/helpers/interfaces/index.js";
import { STATIC_CONTEXT } from "@nestjs/core/injector/constants.js";
import { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper.js";
import { CommandDiscovery } from "../commands/command.discovery.js";
import {
	COMMAND_GROUP_KEY,
	CommandGroupMeta,
} from "../commands/decorators/command-group.decorator.js";
import {
	SubcommandDiscovery,
	SubcommandMeta,
} from "../commands/subcommand.discovery.js";
import {
	NestWhatsBaseDiscovery,
	NestWhatsContextType,
	NestWhatsParamsFactory,
} from "../context/index.js";

/**
 * Finds the `@Command`, `@Subcommand` and `@On`/`@Once` handlers in the
 * application and wires each one to NestJS' pipeline, so guards, pipes,
 * interceptors and filters apply exactly as they do on a controller.
 */
@Injectable()
export class ExplorerService<
	T extends NestWhatsBaseDiscovery,
> extends Reflector {
	private readonly logger = new Logger("NestWhats");
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

				if (!item) return undefined;

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
			if (!groupMeta) {
				this.warnOrphanGroupMembers(instance, subcommandKey, defaultKey);
				continue;
			}

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

	private warnOrphanGroupMembers(
		instance: any,
		subcommandKey: string | symbol,
		defaultKey: string | symbol,
	): void {
		const prototype = Object.getPrototypeOf(instance);

		for (const methodName of this.metadataScanner.getAllMethodNames(
			prototype,
		)) {
			const decorator =
				this.get(subcommandKey, instance[methodName]) !== undefined
					? "@Subcommand"
					: this.get(defaultKey, instance[methodName]) !== undefined
						? "@GroupDefault"
						: undefined;
			if (!decorator) continue;
			this.logger.warn(
				`${decorator} on "${instance.constructor.name}.${methodName}" requires @CommandGroup on the class — it will be ignored`,
			);
		}
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
