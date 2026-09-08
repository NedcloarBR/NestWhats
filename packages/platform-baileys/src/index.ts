export * from "./adapter.js";
export * from "./chat-store.js";
export * from "./group-metadata-cache.js";
export * from "./message-cache.js";
export * from "./ttl-cache.js";

// Side effect: registers the Baileys-only capabilities with the core.
import "./capabilities.js";

export * from "./decorators/on.decorator.js";
export * from "./events/index.js";
export * from "./factory.js";
export * from "./logger.js";
export * from "./messaging/messaging.module.js";
export * from "./messaging/messaging.service.js";
export * from "./options-schema.js";
export * from "./passkey/index.js";
export * from "./platform.js";
export * from "./structures/index.js";
