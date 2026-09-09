---
sidebar_position: 3
title: Getting started
description: A working bot, from an empty project to a reply on your phone.
---

# Getting started

This builds a bot that answers `!ping`. It uses whatsapp-web.js, which drives a
real WhatsApp Web session — you will scan a QR code with your phone.

:::warning
An unofficial platform automates a normal WhatsApp account, which breaks
WhatsApp's terms of service and can get the number banned. Use a number you can
afford to lose while you are learning.
:::

## 1. Register the module

The `adapters` array takes a **factory** — the thing that builds one adapter per
client, holding the configuration they share. `clients` names the clients to
start.

```typescript title="src/app.module.ts" showLineNumbers
import { Module } from '@nestjs/common';
import { NestWhatsClientConfig, NestWhatsModule } from 'nestwhats';
import {
  LocalAuth,
  WhatsAppWebJsAdapterFactory,
} from '@nestwhats/platform-whatsapp-web.js';
import { AppHandler } from './app.handler';

@Module({
  imports: [
    NestWhatsModule.forRoot({
      adapters: [
        new WhatsAppWebJsAdapterFactory({
          authStrategy: new LocalAuth(),
        }),
      ],
      clients: [
        new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, {
          name: 'personal',
          prefix: '!',
        }),
      ],
    }),
  ],
  providers: [AppHandler],
})
export class AppModule {}
```

:::tip
Import `LocalAuth` from the platform package, not from `whatsapp-web.js`. That
library is CommonJS, and under ESM its named exports arrive `undefined` with no
error until something reads them. The platform package re-exports the working
values.
:::

## 2. Write a handler

A handler is an ordinary provider. Decorate methods, and inject whatever you
need.

```typescript title="src/app.handler.ts" showLineNumbers
import { Injectable } from '@nestjs/common';
import { Command, Message, On, type NestWhatsMessage } from 'nestwhats';

@Injectable()
export class AppHandler {
  @Command({ name: 'ping', description: 'Answers with pong' })
  public async onPing(@Message() message: NestWhatsMessage) {
    await message.reply('pong');
  }

  @On('ready')
  public onReady() {
    console.log('connected');
  }
}
```

## 3. Start it

```typescript title="src/main.ts"
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const app = await NestFactory.createApplicationContext(AppModule);
app.enableShutdownHooks();
```

`enableShutdownHooks()` matters: it is what closes the browser and the session
cleanly on Ctrl+C.

Run it, scan the QR code printed in the terminal, and send `!ping` to the
number from another phone.

## What to read next

- [The module](./core/module.md) — several clients, async configuration, virtual clients
- [Commands](./core/commands.md) — arguments, groups, subcommands
- [Capabilities](./core/capabilities.md) — what changes when you swap the platform
- [Dashboard](./packages/dashboard.md) — a web UI for the QR code and connection state
