import { applyDecorators, SetMetadata } from "@nestjs/common";
import { NESTWHATS_MANAGED_LISTENER } from "nestwhats";

/** Method metadata key marking a listener as webhook-managed. */
export const WEBHOOK_HANDLER_METADATA = "NESTWHATS_WEBHOOK::HANDLER";

/** Reserved for per-handler webhook options; empty today. */
// biome-ignore lint/suspicious/noEmptyInterface: reserved for future options (e.g. dispatch targets)
export interface WebhookHandlerOptions {}

/**
 * Marks an @On/@Once listener as webhook-managed: it is excluded from the
 * automatic binding and becomes bindable/unbindable at runtime per client
 * through NestWhatsWebhookService.
 */
export const Webhook = (options: WebhookHandlerOptions = {}): MethodDecorator =>
	applyDecorators(
		SetMetadata(NESTWHATS_MANAGED_LISTENER, true),
		SetMetadata(WEBHOOK_HANDLER_METADATA, options),
	);
