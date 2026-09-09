---
sidebar_position: 1
title: Introduction
description: What NestWhats is, and what it is not.
---

# NestWhats

NestWhats is a [NestJS](https://nestjs.com) framework for working with
WhatsApp. It covers both directions: reading what arrives, the way you write
[controllers](https://docs.nestjs.com/controllers) — decorators, dependency
injection, guards, pipes and filters — and sending from anywhere in your
application through an injected client. The framework handles the connection.

A bot is the obvious use, and not the only one: a connected number is a
provider like any other, so the same module serves notifications, alerts and
whatever else a product has to send.

```typescript
@Injectable()
export class AppHandler {
  @Command({ name: 'ping', description: 'Answers with pong' })
  public async onPing(@Message() message: NestWhatsMessage) {
    await message.reply('pong');
  }
}
```

## Platform-agnostic since v4

The core does not know what WhatsApp is. It defines neutral structures —
`NestWhatsMessage`, `NestWhatsChat`, `NestWhatsContact` — and an adapter
contract; a platform package connects to an actual WhatsApp library. It is the
same shape NestJS itself uses for Express and Fastify.

That matters because the ways to reach WhatsApp differ enormously:

| | How it connects | Cost per session |
|---|---|---|
| **whatsapp-web.js** | Real WhatsApp Web in a headless browser | ~1&nbsp;GB of RAM |
| **Baileys** | WebSocket, no browser | Megabytes |

Your handlers do not change when you swap one for another. What *does* change is
what the platform can do. NestWhats makes that explicit rather than letting it
fail at runtime: see [Capabilities](./core/capabilities.md).

## What you get

- [**Commands**](./core/commands.md) with prefixes, arguments, groups and subcommands
- [**Listeners**](./core/listeners.md) for every event the platform emits, in one vocabulary
- [**Guards, pipes and filters**](./core/guards-and-filters.md), the Nest ones you already know
- [**Several clients in one app**](./core/clients.md), each with its own session and prefix
- [**A dashboard**](./packages/dashboard.md) to watch connections, scan QR codes and create clients at runtime
- [**Webhooks**](./packages/webhook.md), [**i18n**](./packages/locale.md), and a health indicator for Terminus

## What it is not

NestWhats is a library, not a server. It has no database and no message store:
it hands you what the platform reports and stays out of the way. If you need
chat history on a platform that does not keep it, that is yours to store.

It also does not make an unofficial platform official. whatsapp-web.js and
Baileys drive a normal WhatsApp account, which is against WhatsApp's terms of
service and can get the number banned. The sanctioned route for a business is
Meta's official Cloud API, and there is no adapter for it here — so use
NestWhats on a number you can afford to lose.

## Where to start

New here? [Installation](./installation.md), then
[Getting started](./getting-started.md) builds a working bot in a few minutes.
