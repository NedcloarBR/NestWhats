/** Injection token holding the resolved {@link NestWhatsWebhookOptions}. */
export const WEBHOOK_OPTIONS = Symbol.for("NESTWHATS::WEBHOOK_OPTIONS");
/**
 * Injection token for the webhook service, for packages that depend on it
 * optionally — the dashboard resolves it this way, and works without it.
 */
export const WEBHOOK_SERVICE_TOKEN = Symbol.for("NESTWHATS::WEBHOOK_SERVICE");

/** Bucket for handlers bound without naming a client. */
export const DEFAULT_BINDING_KEY = "__default__";
