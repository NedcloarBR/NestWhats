---
sidebar_position: 4
title: Listeners
description: The event vocabulary, and how it stays the same across platforms.
---

# Listeners

`@On()` subscribes for as long as the client lives; `@Once()` fires a single
time.

```typescript title="src/bot.listener.ts" showLineNumbers
@Injectable()
export class BotListener {
  @On('ready')
  public onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`${client.name} connected`);
  }

  @Once('qr')
  public onFirstQr(@Context() [, qr]: ContextOf<'qr'>) {
    this.logger.log(`scan this once: ${qr}`);
  }
}
```

`ContextOf<'event'>` types the tuple: the client first, then that event's own
arguments.

## Base events

Available on every adapter, whatever the platform.

| Event | Arguments | When |
|---|---|---|
| `connectionUpdate` | `ConnectionUpdate` | Raw state from the adapter |
| `messageUpsert` | `NestWhatsMessage` | Any message, sent or received |
| `messageStatus` | `NestWhatsMessageStatusUpdate` | A sent message was delivered, read, or failed |
| `presenceUpdate` | `NestWhatsPresenceUpdate` | A contact came online, went offline, or is typing |
| `qr` | `string` | A new QR payload to render |
| `pairingCode` | `string` | The code to type on the phone |
| `authenticated` | — | Credentials accepted; not usable yet |
| `ready` | — | Connected and able to send |
| `disconnected` | `DisconnectReason \| undefined` | The client went down |

`qr`, `pairingCode`, `authenticated`, `ready` and `disconnected` are **derived**
by the core from `connectionUpdate`. An adapter reports state; the core decides
what that means, which is why status events fire only on a real transition —
platforms repeat their state on every reconnect, and a second `ready` would
defeat `@Once`.

Prefer the derived events. `connectionUpdate` is there when you need the raw
stream.

## Platform events

Anything a platform offers beyond the contract keeps its own name, added through
module augmentation. With `@nestwhats/platform-whatsapp-web.js` imported, every
whatsapp-web.js event is available and typed:

```typescript
@On('messageReaction')
public onReaction(@Context() [, reaction]: ContextOf<'messageReaction'>) {}
```

Subscribing to an event the adapter cannot emit is refused rather than silently
never firing — the adapter declares what it supports, and the core checks.

## Scoping to one client

```typescript
@On('ready', { client: 'business' })
public onBusinessReady() {}
```

## Subscribing outside a handler

An injected client carries the same vocabulary, and `on` returns the function
that unsubscribes:

```typescript
const stop = this.client.on('messageStatus', (update) => { /* … */ });
stop();
```

Which emitter an event lives on — the core for the derived ones, the adapter for
the platform's own — is decided for you.
