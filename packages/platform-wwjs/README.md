<h1 align="center">
  <br>
  <img width="35" src="https://github.com/NedcloarBR/NestWhats/blob/master/assets/logo.png?raw=true"> @nestwhats/platform-whatsapp-web.js
  <br>
</h1>

<h3 align="center"><b><a href="https://wwebjs.dev/">whatsapp-web.js</a></b> adapter for <b><a href="https://www.npmjs.com/package/nestwhats">NestWhats</a></b></h3>

<p align="center">
  <a href="https://github.com/NedcloarBR/NestWhats/blob/master/License">
    <img src="https://img.shields.io/github/license/NedcloarBR/NestWhats" alt="License">
  </a>
  <a href="https://www.npmjs.com/package/@nestwhats/platform-whatsapp-web.js">
    <img src="https://img.shields.io/npm/v/%40nestwhats%2Fplatform-whatsapp-web.js" alt="npm version">
  </a>
  <a href="https://nedcloarbr.github.io/nestwhats/docs/platforms/whatsapp-web-js">
    <img src="https://img.shields.io/badge/docs-nestwhats-c11e43" alt="Documentation">
  </a>
</p>

<p align="center">
  <b><a href="https://nedcloarbr.github.io/nestwhats/docs/platforms/whatsapp-web-js">Read the documentation</a></b>
</p>

## ❓ About

This package connects [NestWhats](https://www.npmjs.com/package/nestwhats) to WhatsApp through [whatsapp-web.js](https://wwebjs.dev/), which drives the WhatsApp Web browser app via Puppeteer.

> [!IMPORTANT]
> **It is not guaranteed you will not be blocked by using this method. WhatsApp does not allow bots or unofficial clients on their platform, so this shouldn't be considered totally safe.**

## ⬇️ Installation

> [!NOTE]
> NodeJS `v20.19+` is required

```bash
$ npm i nestwhats @nestwhats/platform-whatsapp-web.js whatsapp-web.js
$ yarn add nestwhats @nestwhats/platform-whatsapp-web.js whatsapp-web.js
$ pnpm add nestwhats @nestwhats/platform-whatsapp-web.js whatsapp-web.js
```

## ⚙️ Usage

```typescript
import { Module } from '@nestjs/common';
import { NestWhatsClientConfig, NestWhatsModule } from 'nestwhats';
import { WhatsAppWebJsAdapterFactory } from '@nestwhats/platform-whatsapp-web.js';
import { LocalAuth } from 'whatsapp-web.js';

@Module({
  imports: [
    NestWhatsModule.forRoot({
      adapters: [
        new WhatsAppWebJsAdapterFactory({
          printAuthData: true,
          authStrategy: new LocalAuth(),
          puppeteer: { args: ['--no-sandbox'] },
        }),
      ],
      clients: [
        new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, { name: 'personal', prefix: '!' }),
        new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, { name: 'business', prefix: '/' }),
      ],
    }),
  ],
})
export class AppModule {}
```

### What it can and cannot do

Being a real WhatsApp Web session, it implements every optional method in the
contract except two — and those two are the ones WhatsApp Web itself does not
offer:

| Not supported | Why |
|---|---|
| `postStatus` | WhatsApp Web has no API for publishing to status/stories |
| `subscribePresence` | and none for watching a contact's presence, so no "last seen" either |

Everything else answers true: media, presence indicators, read receipts,
revokes, chat and contact lookups, logout, group creation and management,
profile name/photo/about, and blocking. On the structures it also implements
`message.edit`, `message.forward` and `chat.description`. A socket platform such as Baileys
covers the two missing ones, which is exactly what
`client.supports(AdapterCapability.PostStatus)` is for.

### Adapter options

`WhatsAppWebJsAdapterOptions` extends the whatsapp-web.js [`ClientOptions`](https://docs.wwebjs.dev/Client.html) with:

| Option    | Type      | Default | Description                                    |
|-----------|-----------|---------|------------------------------------------------|
| `printAuthData` | `boolean` | `true`  | Prints the QR code — or the pairing code, when `pairWithPhoneNumber` is set — in the terminal, prefixed with the client name. |

`WhatsAppWebJsAdapterFactory` takes all of those plus `id`, which names the factory (default `whatsapp-web.js`). Give a second factory its own id to register the same platform twice with different configuration.

The factory never hands two clients the same `LocalAuth`: it builds a fresh one per client, using the client name as `clientId` unless that client passed its own `authStrategy`. Each client therefore gets its own session folder under `.wwebjs_auth/`.

### Authenticating

By default a client shows a QR code. Set `pairWithPhoneNumber` and it asks for an 8-digit pairing code instead, which the phone accepts under *Linked devices → Link with phone number*:

```typescript
new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, {
  name: 'business',
  options: { pairWithPhoneNumber: { phoneNumber: '5511999998888' } },
})
```

In the dashboard this is a radio: picking **QR code** shows the QR settings, picking **Pairing code** shows the phone number and the notification toggle. Fields belonging to the other mode are hidden and never submitted, so switching cannot leave a stale value behind.

Either way the value reaches handlers through `connectionUpdate` — as `qr` with `ClientStatus.QrReceived`, or as `pairingCode` with `ClientStatus.PairingCodeReceived` — and the dashboard shows whichever applies. `printAuthData` (default `true`) also prints it to the terminal.

`authTimeoutMs` defaults to **120s** here rather than the 30s whatsapp-web.js uses: its default assumes a single client, while NestWhats commonly starts several browsers at once and the later ones lose that race on modest hardware. If you still hit it, the error says so and suggests raising it.

### Linked device identity

whatsapp-web.js lets you set what shows up under *Linked devices* on the phone. `deviceName` overrides the reported OS and `browserName` the browser, which together are the equivalent of Baileys' `[os, browser, version]` triple:

```typescript
new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, {
  name: 'business',
  options: { deviceName: 'Verso Business', browserName: 'Chrome' },
})
```

> [!WARNING]
> **These currently have no effect.** whatsapp-web.js applies them by overriding `info()` on WhatsApp Web's `WAWebMiscBrowserUtils` module, and that module no longer exposes `info` — verified against whatsapp-web.js 1.34.7, the latest release. The override replaces it with a function that calls the old one, so any later read throws `TypeError: func is not a function`. The phone shows whatever it detects, which for Chromium is "Chrome". The options are kept because they are part of `ClientOptions` and will start working again if upstream fixes it.

`browserName` accepts `Chrome`, `Firefox`, `IE`, `Opera`, `Safari` or `Edge`. The factory merges each client's options over the shared ones, so per-client values win and everything else is inherited — different numbers can present different identities.

The value is applied while authenticating, so changing it on an already-paired client does not rename the entry: log out and pair again to see it.

The adapter also launches puppeteer with `handleSIGINT`, `handleSIGTERM` and `handleSIGHUP` set to `false`, so that NestJS owns the shutdown: puppeteer's own `SIGINT` handler calls `process.exit(130)` and would kill the app before `onApplicationShutdown` runs. Pass your own values under `puppeteer` to opt back in.

## 📡 Platform events

Importing this package augments the NestWhats event map, so whatsapp-web.js events work in `@On`/`@Once`/`ContextOf` with full typing. The `WWebJsOn`/`WWebJsOnce` decorators are also available with the same behavior and explicit platform typing:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Context, ContextOf, On } from 'nestwhats';
import { WWebJsOn } from '@nestwhats/platform-whatsapp-web.js';

@Injectable()
export class AppUpdate {
  private readonly logger = new Logger(AppUpdate.name);

  @WWebJsOn('call')
  public onCall(@Context() [, call]: ContextOf<'call'>) {
    this.logger.log(`Incoming call from ${call.from}`);
  }

  @On('messageAck')
  public onAck(@Context() [, message, ack]: ContextOf<'messageAck'>) {}
}
```

Platform-specific events: `call`, `changeState`, `chatArchived`, `chatRemoved`, `code`, `contactChanged`, `groupAdminChanged`, `groupJoin`, `groupLeave`, `groupMembershipRequest`, `groupUpdate`, `loadingScreen`, `mediaUploaded`, `messageAck`, `messageCiphertext`, `messageEdit`, `messageReaction`, `messageRevokeEveryone`, `messageRevokeMe`, `remoteSessionSaved`, `unreadCount`, `voteUpdate`.

## ✉️ Messaging

This adapter drives a real WhatsApp Web session, so it implements every optional
method the contract has — media, presence, read receipts, revokes, chat and
contact lookup, chat listing and logout — which is what announces the matching
capabilities; it declares no capability set of its own. All of them are reached
through the core `NestWhatsMessagingService`, so nothing here needs a
platform-specific service:

```typescript
import { Injectable } from '@nestjs/common';
import { NestWhatsMessagingService, PresenceState } from 'nestwhats';
import { readFile } from 'node:fs/promises';

@Injectable()
export class MediaService {
  public constructor(private readonly messaging: NestWhatsMessagingService) {}

  public async sendImage(chatId: string, path: string) {
    await this.messaging.sendMedia(
      chatId,
      { data: await readFile(path), mimetype: 'image/png', filename: 'shot.png' },
      { client: 'personal' },
    );
    await this.messaging.sendPresence(chatId, PresenceState.Paused);
  }
}
```

`WhatsAppWebJsMessagingService` is now only the escape hatch: it adds `sendRawMedia`, which takes a native `MessageMedia` and the full `MessageSendOptions` surface — buttons, link previews, stickers — for the things whatsapp-web.js alone offers:

```typescript
await this.messaging.sendRawMedia(chatId, MessageMedia.fromFilePath(path), {
  sendOptions: { sendMediaAsSticker: true },
});
```

## 📦 Importing whatsapp-web.js values

whatsapp-web.js is CommonJS. From an ES module, Node's named-export detection
only finds part of it — `Client` comes through, while `Events`, `LocalAuth`,
`MessageMedia`, `MessageTypes` and `WAState` arrive `undefined`, with no error
until something reads them:

```typescript
import { LocalAuth } from 'whatsapp-web.js';  // undefined at runtime
new LocalAuth();                              // TypeError
```

This package re-exports all of them, so take them from here instead:

```typescript
import { LocalAuth, Events, MessageMedia } from '@nestwhats/platform-whatsapp-web.js';
```

Types are unaffected — `import type { Message } from 'whatsapp-web.js'` is
erased at compile time and keeps working.

## 🔓 Raw access

The NestWhats structures cover what every platform can honour — id, body, sender, `reply`, `react`. Everything else whatsapp-web.js offers lives on `raw`, typed as the native object, with no cast:

| Structure | `raw` type |
|-----------|------------|
| `WWebJsMessage` | `Message` |
| `WWebJsChat` | `Chat` |
| `WWebJsContact` | `Contact` |
| `WhatsAppWebJsAdapter` | `Client` |

```typescript
@Command({ name: "raw" })
async onRaw(@Message() msg: WWebJsMessage) {
  msg.body;              // portable contract
  msg.raw.deviceType;    // whatsapp-web.js, typed
  await msg.raw.downloadMedia();
}
```

Type the parameter as `WWebJsMessage` (not `NestWhatsMessage`) to get the native typings. A handler that must stay platform-agnostic keeps `NestWhatsMessage` and sticks to the contract.

## 🧭 Neutral ids

Ids cross the adapter boundary normalised, so what your app stores survives a change of platform:

| NestWhats | whatsapp-web.js |
|-----------|-----------------|
| `5511999@user` | `5511999@c.us` |
| `123-456@group` | `123-456@g.us` |
| `789@lid` | `789@lid` |

The `:device` part is dropped (`5511999:12@c.us` → `5511999@user`). `sendMessage`, `getChat` and `getContact` accept either form. The native id is always on `raw` — `msg.raw.from` still reads `5511999@c.us`.

## 🔄 Staying in sync with whatsapp-web.js

Disconnects map the whatsapp-web.js `WAState` onto the portable kinds — `UNPAIRED` becomes `logged_out`, `TOS_BLOCK` becomes `forbidden`, `NAVIGATION` and `TIMEOUT` become `connection_lost` — with the original state kept in `reason.code`.

The adapter reports connection state through the portable `connectionUpdate` and messages through `messageUpsert`; the core derives `ready`, `qr`, `authenticated` and `disconnected` from the former. whatsapp-web.js' own events stay available under their own names — `messageCreate`, `message`, `authFailure`, `call`, and the rest.

Event names are derived at runtime from the whatsapp-web.js `Events` enum and converted from `snake_case` to `camelCase`, so an event added upstream is forwarded as soon as you bump the dependency — nothing to register by hand.

The argument types are declared in `WWebJsSpecificEvents`, because whatsapp-web.js types `Client.on` through overloads and TypeScript cannot extract those. A compile-time check makes that omission loud instead of silent: adding an event upstream without a signature here fails the build naming the event.

```
error TS2344: Type '"changeBattery"' does not satisfy the constraint 'true'.
```

## 📖 License

[GPL-3.0 License](https://github.com/NedcloarBR/NestWhats/blob/master/License)
