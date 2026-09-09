---
sidebar_position: 2
title: whatsapp-web.js
description: A real WhatsApp Web session in a headless browser.
---

# whatsapp-web.js

```bash npm2yarn
npm install @nestwhats/platform-whatsapp-web.js whatsapp-web.js
```

```typescript title="src/app.module.ts" showLineNumbers
import {
  LocalAuth,
  WhatsAppWebJsAdapterFactory,
} from '@nestwhats/platform-whatsapp-web.js';

NestWhatsModule.forRoot({
  adapters: [
    new WhatsAppWebJsAdapterFactory({
      printAuthData: true,
      authStrategy: new LocalAuth(),
      puppeteer: { args: ['--no-sandbox'] },
    }),
  ],
  clients: [
    new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, { name: 'personal' }),
  ],
})
```

:::tip Import from this package, not from whatsapp-web.js
`whatsapp-web.js` is CommonJS, and Node's named-export detection leaves
`Events`, `LocalAuth`, `MessageMedia`, `MessageTypes` and `WAState` `undefined`
when an ES module imports them directly — with no error, until something reads
them. This package re-exports the working values.
:::

## Options

Everything `ClientOptions` accepts, plus:

| Option | Default | What it does |
|---|---|---|
| `printAuthData` | `true` | Prints the QR — or the pairing code — in the terminal |
| `id` | `whatsapp-web.js` | Names the factory, for registering it twice |

Each client gets its own `LocalAuth`, named after the client, so each keeps a
separate session directory under `.wwebjs_auth/`.

`authTimeoutMs` defaults to **120s** here rather than the 30s upstream uses:
that default assumes a single client, while NestWhats commonly starts several
browsers at once and the later ones lose that race on modest hardware.

## Authenticating

By default a client shows a QR code. Set `pairWithPhoneNumber` and it asks for
an 8-digit code instead, entered on the phone under *Linked devices → Link with
phone number*:

```typescript
new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, {
  name: 'business',
  options: { pairWithPhoneNumber: { phoneNumber: '5511999998888' } },
})
```

Either way the value reaches handlers as `qr` or `pairingCode`, and the
dashboard shows whichever applies.

## What it can and cannot do

It implements every optional method in the contract **except two**, and those
are the ones WhatsApp Web itself does not offer:

| Not supported | Why |
|---|---|
| `postStatus` | No API for publishing to status/stories |
| `subscribePresence` | No API for watching presence, so no "last seen" either |

Everything else answers true: media, presence indicators, read receipts,
revokes, chat and contact lookups, logout, group creation and management,
profile name/photo/about, and blocking. On the structures it also implements
`message.edit`, `message.forward` and `chat.description`.

## Shutdown

Puppeteer installs its own `SIGINT` handler that calls `process.exit(130)`,
which would kill the app before Nest runs its shutdown hooks. This adapter turns
those handlers off — Nest owns the lifecycle, and `destroy()` closes the
browser. Call `app.enableShutdownHooks()` and Ctrl+C closes cleanly.

## Known upstream issues

`deviceName` and `browserName` are part of `ClientOptions` but **currently have
no effect**. whatsapp-web.js applies them by overriding `info()` on a WhatsApp
Web module that no longer exposes it — verified against 1.34.7 — so the phone
shows whatever it detects. The options are kept because they will start working
again if upstream fixes it.
