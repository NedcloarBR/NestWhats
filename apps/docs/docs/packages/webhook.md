---
sidebar_position: 2
title: Webhook
description: Listeners you can bind and unbind at runtime, per client.
---

# Webhook

```bash npm2yarn
npm install @nestwhats/webhook
```

This package is about **outbound dispatch**: marking listeners so they can be
attached and detached at runtime, per client, without a redeploy. Forwarding the
result somewhere — an HTTP endpoint, a queue, a CRM — is what your handler does.

```typescript
NestWhatsWebhookModule.forRoot()   // persists bindings to .nestwhats/webhook-bindings.json
```

Without `forRoot` the module still works, but bindings are lost on restart.

## Marking a listener

```typescript title="src/webhook.handler.ts" showLineNumbers
@Injectable()
export class WebhookHandler {
  @On('messageUpsert')
  @Webhook()
  public async onMessage(@Context() [client, message]: ContextOf<'messageUpsert'>) {
    await this.http.post(this.url, { client: client.name, body: message.body });
  }
}
```

`@Webhook()` handlers are **excluded from automatic binding** — they fire only
after being bound, through `NestWhatsWebhookService` or the dashboard. That is
the point: which client forwards which event becomes a runtime decision.

If the target client's adapter cannot emit the event, the bind is skipped with a
warning rather than silently never firing.

## Binding

```typescript
await this.webhooks.bind('onMessage', { client: 'business' });
await this.webhooks.unbind('onMessage', { client: 'business' });

this.webhooks.getHandlers();                        // everything marked @Webhook()
this.webhooks.getBoundHandlers({ client: 'business' });
```

Set `webhook: true` on the dashboard module and the same controls appear on each
client's card.

## What is stored

Bindings only — which handler is attached to which client. The clients
themselves belong to the core; configure `storage` on `NestWhatsModule.forRoot`
to persist those.
