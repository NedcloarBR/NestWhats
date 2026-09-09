---
sidebar_position: 3
title: Baileys
description: A WebSocket connection to WhatsApp, with no browser.
---

# Baileys

Baileys talks to WhatsApp over a WebSocket, with no browser anywhere. A session
costs megabytes rather than the gigabyte whatsapp-web.js needs, which is what
makes running many numbers on one server practical.

```bash npm2yarn
npm install @nestwhats/platform-baileys @whiskeysockets/baileys
```

The peer range is `@whiskeysockets/baileys@^7.0.0-rc14`.

```typescript title="src/app.module.ts"
import { BaileysAdapterFactory } from '@nestwhats/platform-baileys';
import { NestWhatsClientConfig, NestWhatsModule } from 'nestwhats';

NestWhatsModule.forRoot({
  adapters: [new BaileysAdapterFactory({ authDir: '.baileys_auth' })],
  clients: [
    new NestWhatsClientConfig(BaileysAdapterFactory, { name: 'personal' }),
  ],
})
```

Each client keeps its own `session-<name>` folder inside `authDir`, so two
clients never share a session.

## Options

`BaileysAdapterOptions` extends Baileys' own `SocketConfig`, minus `auth` and
`browser`, which the adapter owns. Anything the library takes, the factory
takes; the table is what this package adds or reads itself.

| Option | Default | What it does |
|---|---|---|
| `authDir` | `.baileys_auth` | Where credentials live |
| `phoneNumber` | — | Link by pairing code instead of QR |
| `printAuthData` | `true` | Print the QR or pairing code to the terminal |
| `deviceName` | `Ubuntu` | What the phone shows under *Linked devices* |
| `browserName` | `Chrome` | The browser shown next to it |
| `fetchLatestVersion` | `true` | Ask WhatsApp for the current Web version before connecting |
| `logLevel` | `error` | How much of Baileys' own logging reaches Nest |
| `rejectCalls` | `false` | Decline incoming calls automatically |
| `passkey` | — | Signs WhatsApp's passkey challenge; see below |
| `passkeyTimeoutMs` | `60000` | How long to wait for an answer to `passkeyChallenge` |
| `chatStore` | `true` | Track the chat list; see [Listing chats](#listing-chats) |
| `chatStoreMax` | `1000` | Chats to keep, least recently active dropped first |
| `groupCache` | `true` | Remember group participants between sends |
| `groupCacheTtlMs` | `300000` | How long a cached participant list stays good |
| `messageCacheMax` | `2000` | Messages to remember, for resends and revokes |

`BaileysAdapterFactory` takes all of those plus `id`, which names the factory
(default `baileys`).

Options passed straight through to Baileys are worth knowing about too:
`syncFullHistory`, `markOnlineOnConnect`, `qrTimeout`, `keepAliveIntervalMs`,
`connectTimeoutMs` and `defaultQueryTimeoutMs` all appear in the adapter's
`optionsSchema`, so [the dashboard](../packages/dashboard.md) offers them when
creating a client.

:::tip deviceName works here
In the whatsapp-web.js adapter these two are inert, because that library writes
them through a module WhatsApp Web dropped. Baileys sends them as the browser
triple, so they show up on the phone.
:::

## What the adapter remembers

Baileys keeps nothing between restarts and asks the application for what it
needs back. Three bounded caches answer that, and each is a plain option:

| Cache | Option | Why it exists |
|---|---|---|
| Messages | `messageCacheMax` | Answers Baileys' `getMessage`, so a recipient who could not decrypt one gets it resent instead of sitting on *waiting for this message*. Also backs revokes, read markers and poll votes. Content only, never media bytes. |
| Group metadata | `groupCache` | Baileys asks for a group's participant list every time it encrypts a message for it. Its own FAQ names that round trip per message as how accounts get rate-limited. Anything that changes the group drops the entry, so a stale list is never used. |
| Chats | `chatStore` | The conversations this client knows about, from the events WhatsApp sends. Metadata only, never messages. |

## Authenticating

By default a client shows a QR code. Set `phoneNumber` and it asks for an
8-digit code instead, entered under *Linked devices → Link with phone number*:

```typescript
new NestWhatsClientConfig(BaileysAdapterFactory, {
  name: 'business',
  options: { phoneNumber: '5511999998888' },
})
```

### Passkeys

Some accounts can only link a device by signing a WebAuthn challenge. Give the
factory a signer and it serves every client, virtual ones included:

```typescript
new BaileysAdapterFactory({ passkey: mySigner })
```

Without a signer the challenge arrives as an event, to be answered whenever you
can produce the assertion:

```typescript
@BaileysOn('passkeyChallenge')
public onChallenge(@Context() [, challenge]: ContextOf<'passkeyChallenge'>) {
  challenge.resolve(assertion);   // or challenge.reject()
}
```

`BaileysMessagingService` exposes `resolvePasskey` and `rejectPasskey` for the
same thing from outside a handler, and `passkeyResult` reports how the pairing
ended.

:::warning Undocumented protocol
The passkey handshake is not part of Baileys. This adapter speaks it directly
over the raw socket, and the field numbers come from observing WhatsApp Web.
It is verified against `7.0.0-rc14`; a change on WhatsApp's side can break it.
:::

## What it adds over a browser session

Two capabilities whatsapp-web.js does not have at all:

```typescript
await client.postStatus('good morning', { audience: [contactId] });

await client.subscribePresence(contactId);
client.on('presenceUpdate', ({ state, lastSeenAt }) => { /* … */ });
```

`lastSeenAt` is absent far more often than present, because WhatsApp hides it by
default. Treat its absence as "not visible", never as "never seen".

## Capabilities only Baileys has

The capability vocabulary is open, so this package registers its own rather than
hiding them behind `raw`:

| Capability | What it covers |
|---|---|
| `createCommunity` / `readCommunity` | Communities, the groups that hold groups |
| `createNewsletter` / `readNewsletter` | Channels, by id or invite code |
| `joinGroup` | Joining a group by invite code |
| `previewInvite` | Looking at a group before joining it |
| `setDisappearing` | The account's default timer for new chats |
| `rejectCall` | Declining an incoming call |
| `readPrivacy` / `setPrivacy` | The account's privacy settings |

They are checked and derived exactly like the built-in ones:

```typescript
if (client.supports('createCommunity')) {
  await client.createCommunity('Neighbourhood');
}
```

## Listing chats

`getChats()` returns the direct conversations this client has seen, plus every
group it is in.

Baileys is stateless by design, and its documentation is explicit that keeping
a chat list is the application's job — so the adapter keeps one, from the
events WhatsApp sends. That store is what fills a chat's name, unread count,
archived, pinned, muted and last-activity fields, and what lets a direct
conversation be listed at all. Groups are asked for on top of it, because
WhatsApp answers for them on request and their metadata carries the subject and
the participants.

Set `chatStore: false` and the method falls back to groups only.

```typescript
const chats = await client.getChats();
const unread = chats.filter((chat) => chat.unreadCount > 0);

await chats[0].archive();
await chats[0].mute(8 * 60 * 60 * 1000);
await chats[0].markRead();
```

:::note A fresh session knows nothing
The store fills from history sync and from traffic, so a client that has just
linked lists little until WhatsApp has sent it something. `syncFullHistory`
decides how much arrives on that first link.
:::

## Events

Every Baileys event is available and typed through `@BaileysOn`, under a
camel-cased name — `message-receipt.update` becomes `messageReceiptUpdate`:

```typescript
@BaileysOn('messagesUpdate')
public onUpdate(@Context() [, updates]: ContextOf<'messagesUpdate'>) {}
```

The native list is derived from Baileys' own `BaileysEventMap`, and a compile
check fails the build naming any event the dependency adds and this package has
not listed.

Three events come from no Baileys event at all:

| Event | Carries |
|---|---|
| `passkeyChallenge` | WhatsApp asked for the account's passkey and no signer is configured |
| `passkeyResult` | How a passkey pairing ended |
| `pollVote` | Someone voted on a poll, with the whole tally |

```typescript
@BaileysOn('pollVote')
public onVote(@Context() [, vote]: ContextOf<'pollVote'>) {}
```

A vote is encrypted against the poll it answers, so `pollVote` only fires while
that poll is still in the message cache — `messageCacheMax` is what decides how
far back that reaches.

:::note `call` needs `@BaileysOn`
`call` is deliberately left out of the global event augmentation. The
whatsapp-web.js package declares an event of the same name with a different
payload, and two augmentations disagreeing on one property is a compile error
in any application that installs both. The event still fires;
`@BaileysOn('call')` types it, `@On('call')` does not.
:::

## Reaching Baileys directly

`BaileysMessagingService.sendRaw` sends any `AnyMessageContent` with the full
option surface, with ids normalised first:

```typescript
await this.baileys.sendRaw(chatId, { text: 'hi', mentions: [id] });
```

The socket itself is on `client.raw`.
