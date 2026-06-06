<h1 align="center">
  <br>
  <img width="35" src="https://github.com/NedcloarBR/NestWhats/blob/master/assets/logo.png?raw=true"> @nestwhats/messaging
  <br>
</h1>

<h3 align="center">Messaging layer for <b><a href="https://www.npmjs.com/package/nestwhats">NestWhats</a></b> — send messages programmatically and dispatch WhatsApp events to external systems</h3>

<p align="center">
  <a href="https://github.com/NedcloarBR/NestWhats/blob/master/License">
    <img src="https://img.shields.io/github/license/NedcloarBR/NestWhats" alt="License">
  </a>
  <a href="https://www.npmjs.com/package/@nestwhats/messaging">
    <img src="https://img.shields.io/npm/v/@nestwhats/messaging" alt="npm version">
  </a>
</p>

## About

`@nestwhats/messaging` extends NestWhats with two capabilities:

- **Outbound dispatch** — use `@WebhookEvent.On` / `@WebhookEvent.Once` to bind WhatsApp events to your own handlers (HTTP webhooks, queues, CRM integrations, etc.) with per-handler granularity and persistent storage.
- **Programmatic sending** — inject `NestWhatsMessagingService` to send text, media, presence states, and more.

> [!NOTE]
> Requires [`nestwhats`](https://www.npmjs.com/package/nestwhats) `^2.4.0` as a peer dependency.

## Installation

```bash
npm i nestwhats @nestwhats/messaging
yarn add nestwhats @nestwhats/messaging
pnpm add nestwhats @nestwhats/messaging
```

## Usage

### Basic setup

Import `NestWhatsMessagingModule` alongside your `NestWhatsModule`. Use `forRoot` to enable persistent storage (saved to `.nestwhats/webhook-state.json` by default):

```typescript
import { Module } from '@nestjs/common';
import { NestWhatsModule } from 'nestwhats';
import { NestWhatsMessagingModule } from '@nestwhats/messaging';

@Module({
  imports: [
    NestWhatsModule.forRoot({ prefix: '!' }),
    NestWhatsMessagingModule.forRoot(),
  ],
})
export class AppModule {}
```

Without `forRoot`, the module still works but bindings are not persisted across restarts.

---

### Sending messages

Inject `NestWhatsMessagingService` anywhere in your application:

```typescript
import { Injectable } from '@nestjs/common';
import { NestWhatsMessagingService } from '@nestwhats/messaging';

@Injectable()
export class NotificationService {
  constructor(private readonly messaging: NestWhatsMessagingService) {}

  async notify(chatId: string) {
    await this.messaging.sendText(chatId, 'Hello from NestWhats!');
  }
}
```

#### Available methods

| Method | Description |
|--------|-------------|
| `sendText(chatId, content, options?)` | Send a text message |
| `sendMedia(chatId, media, options?)` | Send an image, audio, or document |
| `sendPresence(chatId, state, options?)` | Send `typing`, `recording`, or `paused` |
| `sendSeen(chatId, options?)` | Mark a chat as read |
| `revokeMessage(messageId, options?)` | Delete a sent message for everyone |

All methods accept an optional `{ client?: string }` options object for multi-client setups.

---

### Binding webhook events

Use `@WebhookEvent.On` or `@WebhookEvent.Once` on methods inside any `@Injectable()` class to register handlers that can be bound/unbound at runtime:

```typescript
import { Injectable } from '@nestjs/common';
import { Ctx, ContextOf } from 'nestwhats';
import { WebhookEvent } from '@nestwhats/messaging';

@Injectable()
export class CrmDispatcher {
  @WebhookEvent.On('message')
  async onDirectMessage(@Ctx() [msg]: ContextOf<'message'>) {
    if (!msg.from.endsWith('@c.us')) return;
    // forward to your CRM, queue, or HTTP endpoint
  }

  @WebhookEvent.On('message')
  async onGroupMessage(@Ctx() [msg]: ContextOf<'message'>) {
    if (!msg.from.endsWith('@g.us')) return;
    // different handler, same event
  }

  @WebhookEvent.Once('ready')
  async onReady() {
    // fires once when the client connects
  }
}
```

Multiple handlers for the same event are tracked independently — each one can be bound or unbound individually.

#### Per-client binding

```typescript
@WebhookEvent.On('message', { client: 'PERSONAL' })
async onPersonalMessage(@Ctx() [msg]: ContextOf<'message'>) {}
```

#### Programmatic bind/unbind

```typescript
import { NestWhatsWebhookService } from '@nestwhats/messaging';

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

By default, `forRoot()` persists bindings to `.nestwhats/webhook-state.json` and restores them on startup. The file is also watched for external changes — edits made outside the application are synced automatically.

#### Custom storage path

```typescript
NestWhatsMessagingModule.forRoot({
  storage: new JsonFileWebhookStorage('./data/bindings.json'),
})
```

#### Custom storage adapter

Implement `WebhookStorageAdapter` to use any backend (Redis, database, etc.):

```typescript
import { WebhookStorageAdapter, WebhookStorageState } from '@nestwhats/messaging';

class RedisWebhookStorage implements WebhookStorageAdapter {
  async load(): Promise<WebhookStorageState> { /* ... */ }
  async save(state: WebhookStorageState): Promise<void> { /* ... */ }
}

NestWhatsMessagingModule.forRoot({ storage: new RedisWebhookStorage() })
```

---

### Logger options

Control which lifecycle events are logged. Pass `false` to silence all logs, `true` (default) to enable all, or a granular object:

```typescript
NestWhatsMessagingModule.forRoot({
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
NestWhatsMessagingModule.forRootAsync({
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
