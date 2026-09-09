<h1 align="center">
  <br>
  <img width="35" src="https://github.com/NedcloarBR/NestWhats/blob/master/assets/logo.png?raw=true"> @nestwhats/webhook
  <br>
</h1>

<h3 align="center">Webhook layer for <b><a href="https://www.npmjs.com/package/nestwhats">NestWhats</a></b> — dispatch WhatsApp events to external systems with persistent, per-handler bindings</h3>

<p align="center">
  <a href="https://github.com/NedcloarBR/NestWhats/blob/master/License">
    <img src="https://img.shields.io/github/license/NedcloarBR/NestWhats" alt="License">
  </a>
  <a href="https://www.npmjs.com/package/@nestwhats/webhook">
    <img src="https://img.shields.io/npm/v/%40nestwhats%2Fwebhook" alt="npm version">
  </a>
  <a href="https://nedcloarbr.github.io/NestWhats/docs/packages/webhook">
    <img src="https://img.shields.io/badge/docs-nestwhats-c11e43" alt="Documentation">
  </a>
</p>

<p align="center">
  <b><a href="https://nedcloarbr.github.io/NestWhats/docs/packages/webhook">Read the documentation</a></b>
</p>

## About

`@nestwhats/webhook` extends NestWhats with **outbound dispatch** — mark regular `@On`/`@Once` listeners with `@Webhook()` to make them bindable/unbindable at runtime per client (including virtual clients), with per-handler granularity. Handler results can be forwarded to external systems (HTTP webhooks, queues, CRM integrations, chat platforms).

Its storage holds **bindings only** — which handler is attached to which client. Virtual clients themselves belong to the core: configure `storage` on `NestWhatsModule.forRoot` to persist those. For programmatic sending, use `NestWhatsMessagingService`, also from the core.

> [!NOTE]
> Requires [`nestwhats`](https://www.npmjs.com/package/nestwhats) `^4.0.0` and a platform adapter package.

## Installation

```bash
npm i nestwhats @nestwhats/webhook
yarn add nestwhats @nestwhats/webhook
pnpm add nestwhats @nestwhats/webhook
```

## Usage

### Basic setup

Import `NestWhatsWebhookModule` alongside your `NestWhatsModule`. Use `forRoot` to enable persistent storage (saved to `.nestwhats/webhook-bindings.json` by default):

```typescript
import { Module } from '@nestjs/common';
import { NestWhatsModule } from 'nestwhats';
import { NestWhatsWebhookModule } from '@nestwhats/webhook';
import { WhatsAppWebJsAdapterFactory } from '@nestwhats/platform-whatsapp-web.js';
import { LocalAuth } from 'whatsapp-web.js';

@Module({
  imports: [
    NestWhatsModule.forRoot({
      adapter: new WhatsAppWebJsAdapterFactory({ authStrategy: new LocalAuth() }),
    }),
    NestWhatsWebhookModule.forRoot(),
  ],
})
export class AppModule {}
```

Without `forRoot`, the module still works but bindings are not persisted across restarts.

---

### Binding webhook events

Mark regular `@On`/`@Once` listeners with `@Webhook()` to register handlers that can be bound/unbound at runtime. They use the standard NestWhats context (the `NestWhatsClient` comes first) and full event typing — including platform-specific events added by adapter packages:

```typescript
import { Injectable } from '@nestjs/common';
import { Context, ContextOf, On, Once } from 'nestwhats';
import { Webhook } from '@nestwhats/webhook';

@Injectable()
export class CrmDispatcher {
  @Webhook()
  @On('message')
  async onDirectMessage(@Context() [client, msg]: ContextOf<'message'>) {
    if (!msg.chatId.endsWith('@user')) return;
    // forward to your CRM, queue, or HTTP endpoint — client.name tells you which client fired
  }

  @Webhook()
  @On('message')
  async onGroupMessage(@Context() [, msg]: ContextOf<'message'>) {
    if (!msg.chatId.endsWith('@g.us')) return;
    // different handler, same event
  }

  @Webhook()
  @Once('ready')
  async onReady() {
    // fires once when the client connects
  }
}
```

> [!NOTE]
> `@Webhook()` handlers are excluded from the automatic binding — they only fire after being bound via `NestWhatsWebhookService` (or the dashboard). If the target client's adapter does not support the event (see `supportedEvents`), the bind is skipped with a warning.

Multiple handlers for the same event are tracked independently — each one can be bound or unbound individually.

#### Per-client binding

```typescript
@Webhook()
@On('message', { client: 'PERSONAL' })
async onPersonalMessage(@Context() [, msg]: ContextOf<'message'>) {}
```

An empty `client: []` makes the handler bindable to no client — useful to park a handler without deleting it.

#### Programmatic bind/unbind

```typescript
import { NestWhatsWebhookService } from '@nestwhats/webhook';

@Injectable()
export class MyService {
  constructor(private readonly webhook: NestWhatsWebhookService) {}

  bindAll() {
    this.webhook.register(); // bind all handlers to the default client
  }

  bindSelective() {
    this.webhook.register({
      client: 'PERSONAL',
      handlers: ['CrmDispatcher.onDirectMessage'],
    });
  }

  unbind() {
    this.webhook.unregister({ handlers: ['CrmDispatcher.onGroupMessage'] });
  }
}
```

Handler keys follow the format `ClassName.methodName`.

---

### Storage

By default, `forRoot()` persists bindings to `.nestwhats/webhook-bindings.json` and restores them on startup. The file is also watched for external changes — edits made outside the application are synced automatically.

#### Custom storage path

```typescript
NestWhatsWebhookModule.forRoot({
  storage: new JsonFileWebhookStorage('./data/bindings.json'),
})
```

#### Custom storage adapter

Implement `WebhookStorageAdapter` to use any backend (Redis, database, etc.):

```typescript
import { WebhookStorageAdapter, WebhookStorageState } from '@nestwhats/webhook';

class RedisWebhookStorage implements WebhookStorageAdapter {
  async load(): Promise<WebhookStorageState> { /* ... */ }
  async save(state: WebhookStorageState): Promise<void> { /* ... */ }
}

NestWhatsWebhookModule.forRoot({ storage: new RedisWebhookStorage() })
```

> This storage holds **bindings only**. Virtual clients belong to the core — configure `storage` on `NestWhatsModule.forRoot` to persist them (see [`nestwhats`](https://www.npmjs.com/package/nestwhats)).

---

### Logger options

Control which lifecycle events are logged. Pass `false` to silence all logs, `true` (default) to enable all, or a granular object:

```typescript
NestWhatsWebhookModule.forRoot({
  logger: {
    bind: true,          // handler bound to a client
    unbind: true,        // handler unbound from a client
    restore: true,       // bindings restored from storage on startup
    fileChanged: true,   // storage file changed externally
    stale: true,         // stored key no longer matches any discovered handler
    syntaxError: true,   // storage file has a JSON parse error
    maxWarningCount: 5,  // suppress stale/syntaxError warnings after N occurrences
  },
})
```

---

### Async configuration

```typescript
NestWhatsWebhookModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    storage: new JsonFileWebhookStorage(config.get('WEBHOOK_STORAGE_PATH')),
    logger: config.get('DEBUG') ? true : { bind: false, unbind: false },
  }),
})
```

---

### Dashboard integration

When using [`@nestwhats/dashboard`](https://www.npmjs.com/package/@nestwhats/dashboard), enable webhook controls to bind/unbind handlers directly from the UI:

```typescript
NestWhatsDashboardModule.forRoot({ webhook: true })
```

Binding changes made in the dashboard are persisted and trigger live SSE updates.

## License

[GPL-3.0](https://github.com/NedcloarBR/NestWhats/blob/master/License)
