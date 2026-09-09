import type { ListenerDiscovery } from "nestwhats";

/**
 * The stable name a handler is bound by — `ClassName.methodName`.
 *
 * It is what gets persisted and what a dashboard shows, so renaming a class or
 * a method drops its existing bindings.
 */
export function getDiscoveryKey(discovery: ListenerDiscovery): string {
	const className = discovery.getClass()?.name ?? "Unknown";
	const methodName = discovery.getHandler()?.name ?? "unknown";
	return `${className}.${methodName}`;
}
