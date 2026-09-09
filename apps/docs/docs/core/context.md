---
sidebar_position: 5
title: Context and injection
description: Getting at the client, the message, and the platform underneath.
---

# Context and injection

## Inside a handler

`@Context()` gives the tuple; the other decorators pick one thing out of it.

```typescript showLineNumbers
@Command({ name: 'whoami', description: 'Tells you who you are' })
public async onWhoAmI(
  @Context() [client, message]: CommandContext,
  @Author() authorId: string,
  @Chat() chatId: string,
) {
  await message.reply(`you are ${authorId} in ${chatId}, via ${client.name}`);
}
```

## Injecting a client

`@InjectClient(name)` provides a `NestWhatsClient` anywhere in the application,
through ordinary [Nest dependency injection](https://docs.nestjs.com/providers).
Name the adapter's option type to read `options` without a cast:

```typescript title="src/notifier.service.ts" showLineNumbers
@Injectable()
export class NotifierService {
  public constructor(
    @InjectClient('personal')
    private readonly client: NestWhatsClient<WhatsAppWebJsAdapterOptions>,
  ) {}

  public async notify(chatId: string, text: string) {
    await this.client.sendMessage(chatId, text);
  }
}
```

Injecting a name no client declares fails at boot with a message naming the
clients that do exist, rather than handing you `undefined`.

## What a client carries

| Member | What it is |
|---|---|
| `name` | How it is named and injected |
| `options` | What it was configured with — its own, merged over the factory's |
| `platform` | Which platform is behind it, known before it connects |
| `adapterId` | Id of the factory that built the adapter |
| `adapter` | The adapter itself |
| `raw` | The platform's own client object, untouched |

Plus the sending, asking and subscribing methods — see
[Messaging](./messaging.md).

## Using the platform directly

`raw` is the escape hatch, fully typed, for anything the contract does not
cover:

```typescript
const native = this.client.raw as Client;  // whatsapp-web.js Client
await native.getWWebVersion();
```

Reaching for `raw` ties that code to one platform. It is always available, and
that is deliberate — a contract that covers everything would either be enormous
or would stop platforms from doing what makes them different.

## Reading every client's state

`ClientsRegistryService` is the live state of every client, updated the moment
an adapter reports a change:

```typescript
const summary = this.registry.getSummary();
// [{ name, status, statusAt, platform, capabilities, qr?, info?, … }]

this.registry.subscribe(() => this.refresh());
```

This is what the dashboard reads, and it is how you build your own.
