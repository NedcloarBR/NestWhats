<h1 align="center">
  <br>
  <img width="35" src="https://github.com/NedcloarBR/NestWhats/blob/master/assets/logo.png?raw=true"> @nestwhats/platform-baileys
  <br>
</h1>

<h3 align="center"><b><a href="https://baileys.wiki/">Baileys</a></b> adapter for <b><a href="https://www.npmjs.com/package/nestwhats">NestWhats</a></b></h3>

<p align="center">
  <a href="https://github.com/NedcloarBR/NestWhats/blob/master/License">
    <img src="https://img.shields.io/github/license/NedcloarBR/NestWhats" alt="License">
  </a>
  <a href="https://www.npmjs.com/package/@nestwhats/platform-baileys">
    <img src="https://img.shields.io/npm/v/%40nestwhats%2Fplatform-baileys" alt="npm version">
  </a>
  <a href="https://nedcloarbr.github.io/NestWhats/docs/platforms/baileys">
    <img src="https://img.shields.io/badge/docs-nestwhats-c11e43" alt="Documentation">
  </a>
</p>

<p align="center">
  <b><a href="https://nedcloarbr.github.io/NestWhats/docs/platforms/baileys">Read the documentation</a></b>
</p>

## ❓ About

This package connects [NestWhats](https://www.npmjs.com/package/nestwhats) to WhatsApp through [Baileys](https://github.com/WhiskeySockets/Baileys), which speaks the WhatsApp Web protocol directly over a WebSocket — no browser, no Puppeteer.

> [!IMPORTANT]
> **It is not guaranteed you will not be blocked by using this method. WhatsApp does not allow bots or unofficial clients on their platform, so this shouldn't be considered totally safe.**

> [!NOTE]
> Tested against `@whiskeysockets/baileys` **7.0.0-rc14**, a release candidate. The peer range is `^7.0.0-rc14`, so a later 7.x — the eventual 7.0.0 included — installs without a new release here. 6.x is a different API and is not supported.

## ⬇️ Installation

> [!NOTE]
> NodeJS `v20.19+` is required

```bash
$ npm i nestwhats @nestwhats/platform-baileys @whiskeysockets/baileys
$ yarn add nestwhats @nestwhats/platform-baileys @whiskeysockets/baileys
$ pnpm add nestwhats @nestwhats/platform-baileys @whiskeysockets/baileys
```

## ⚙️ Usage

```typescript
import { Module } from '@nestjs/common';
import { NestWhatsClientConfig, NestWhatsModule } from 'nestwhats';
import { BaileysAdapterFactory } from '@nestwhats/platform-baileys';

@Module({
  imports: [
    NestWhatsModule.forRoot({
      adapters: [new BaileysAdapterFactory({ authDir: '.baileys_auth' })],
      clients: [
        new NestWhatsClientConfig(BaileysAdapterFactory, { name: 'personal', prefix: '!' }),
        new NestWhatsClientConfig(BaileysAdapterFactory, {
          name: 'business',
          prefix: '/',
          options: { phoneNumber: '5511999998888' },
        }),
      ],
      reconnect: {},
    }),
  ],
})
export class AppModule {}
```

> [!IMPORTANT]
> **Turn `reconnect` on.** Baileys does not reconnect by itself: a closed socket is gone for good, and even a successful pairing ends with WhatsApp closing the socket with `restartRequired` (515). The adapter reports each drop through `connectionUpdate` and builds a fresh socket every time `initialize()` is called; the core's reconnect loop is what calls it. Without `reconnect`, a client stops at its first drop — and a brand-new client never gets past pairing.

### What it can and cannot do

Being a socket it implements every optional method in the contract. Everything answers true: media, presence indicators, read receipts, revokes, chat and contact lookup, logout, group creation and management, profile name/photo/about, blocking — and the two things a browser session cannot do, **posting to status** (`postStatus`) and **subscribing to presence** (`subscribePresence`, with `presenceUpdate` carrying "last seen"). It also implements `message.edit` (text and captions), `message.forward`, `message.react`, `message.downloadMedia`, `message.getQuotedMessage` and `chat.description`.

What Baileys has that the core has no name for is added to the vocabulary rather than hidden behind `raw`:

| Capability | Method | What it does |
|---|---|---|
| `createCommunity` | `createCommunity(subject, description)` | Starts a community — a group that holds groups. Comes back as a chat with the group and community operations on it. |
| `readCommunity` | `getCommunity(id)` | Fetches a community this account is in, as the same chat. `undefined` otherwise. |
| `createNewsletter` | `createNewsletter(name, description?)` | Starts a channel. Comes back as a `BaileysNewsletter`. |
| `readNewsletter` | `getNewsletter(idOrInviteCode)` | Fetches a channel by canonical `…@newsletter` id, or by the invite code after `whatsapp.com/channel/` for one this account does not follow yet. |
| `joinGroup` | `joinGroup(inviteCode)` | Joins a group by its invite code and answers the canonical id. |
| `previewInvite` | `getInviteInfo(inviteCode)` | What a group looks like from outside, before joining. |
| `setDisappearing` | `setDefaultDisappearing(seconds)` | The account's default disappearing timer for new chats. |
| `rejectCall` | `rejectCall(callId, callerId)` | Declines an incoming call, with the id from the `call` event. The `rejectCalls` option does it for every call automatically. |
| `readPrivacy` | `getPrivacySettings()` | The account's privacy settings — last seen, online, profile picture, about, status, read receipts, group add, calls, messages — as `BaileysPrivacySettings`. |
| `setPrivacy` | `setPrivacySettings(partial)` | Changes any of them; the rest are left alone. The values are WhatsApp's own: `all`, `contacts`, `contact_blacklist`, `none`, and per-setting variants. |

All are registered on import, so `client.supports('rejectCall')` is typed and derived like a built-in one, and the dashboard lists them.

Managing a community or a channel lives on the structure, the way group management lives on the chat. A community is a `BaileysChat` whose `isCommunity` is true; besides the group operations it has `getLinkedGroups`, `linkGroup`, `unlinkGroup` and `createLinkedGroup`, all absent on a plain group so `if (chat.linkGroup)` answers per chat:

```typescript
const community = await client.getCommunity('120363@group');
if (community?.createLinkedGroup) {
  const support = await community.createLinkedGroup('Suporte', ['5511999998888@user']);
  await community.linkGroup(existingGroupId);
  for (const group of await community.getLinkedGroups()) console.log(group.name, group.size);
}
```

A `BaileysNewsletter` carries what a follower can do — `follow`, `unfollow`, `mute`, `unmute`, `react(serverId, emoji)` — and what an admin can do — `setName`, `setDescription`, `setPicture`, `removePicture`, `transferOwnership`, `delete` — plus `inviteCode`, `subscriberCount`, `isVerified`, `isMuted`, and `getSubscriberCount()` for a fresh number. WhatsApp answers at call time whether this account may. Posts from followed channels arrive through `messagesUpsert` with a `…@newsletter` chat id; there is no method to fetch past posts, since Baileys returns the raw stanza for that and does not decode it.

```typescript
const channel = await client.getNewsletter('0029VaAbCdEfGhIjKlMnOp');  // invite code
await channel?.follow();
```

```typescript
await client.setPrivacySettings({ lastSeen: 'contacts', readReceipts: 'none' });
const { online } = await client.getPrivacySettings();
```

Declining calls is the one most bots want on by default; `rejectCalls: true` hangs up on every offer as it arrives, skipping calls this account places from another device, and the `call` event still fires so a handler can answer with a message:

```typescript
@BaileysOn('call')
public async onCall(@Context() [client, calls]: ContextOf<'call', BaileysEvents>) {
  for (const call of calls) {
    if (call.status === 'offer') await client.sendMessage(toCanonicalJid(call.from), 'Não atendo chamadas.');
  }
}
```

### Managing a chat

Archiving, pinning, muting, marking read or unread, clearing and deleting are **conversation** operations, not group ones, so every `BaileysChat` has them — a direct chat as much as a group:

```typescript
const chat = await client.getChat('5511999998888@user');

await chat.archive();                        // archive(false) to undo
await chat.pin();
await chat.mute(MuteDuration.EightHours);    // mute(null) to unmute
await chat.markRead();                       // markUnread() for the blue dot
await chat.clearMessages();                  // empties it, keeps the chat
await chat.delete();                         // removes it from the list
```

WhatsApp syncs these across the account's devices against the last message it saw, so `archive`, `markRead`, `markUnread`, `clearMessages` and `delete` need a message this client has seen in that chat. When there is none the call throws saying so, rather than sending a malformed modification — a wrong one risks the account being logged out of every device. `pin` and `mute` carry no marker and always work.

Disappearing messages are per chat and work on both kinds, through whichever call WhatsApp wants for that kind:

```typescript
await chat.setDisappearing(DisappearingDuration.SevenDays);  // Off to stop
await client.setDefaultDisappearing(DisappearingDuration.TwentyFourHours);  // new chats
```

On the message itself: `star()` / `star(false)`, and `pin(seconds)` / `unpin()` for pinning a message to the top of the chat (WhatsApp allows 24 hours, 7 days or 30 days).

Group-only operations stay on a group, answered by the member itself (`if (chat.addParticipants)`): participants, subject, description, picture, invite code, leaving, and the settings — `setAnnouncementOnly`, `setLocked`, `setMemberAddMode`, `setJoinApprovalMode`, `getJoinRequests` and `reviewJoinRequests`. Joining one from the outside is on the client: `getInviteInfo(code)` to look first, `joinGroup(code)` to go in.

### What the adapter does to keep the account healthy

Three of Baileys' socket options are the difference between a bot that works and one that gets throttled, and its documentation is blunt about all three. The adapter sets them itself, and each can be overridden by passing your own:

- **`cachedGroupMetadata`.** Baileys asks WhatsApp for a group's participant list *every time* it encrypts a message for that group; Baileys' own FAQ names that round trip per message as how accounts get rate-limited sending in groups. The adapter caches it for five minutes and drops the entry whenever `groups.update` or `group-participants.update` says the group changed, so a stale list is never used to encrypt. `groupCache: false` turns it off.
- **`getMessage`.** When a recipient cannot decrypt a message, WhatsApp asks the sender to re-encrypt it. With no answer the message sits on their side as "waiting for this message" forever — the most common complaint in the FAQ. The adapter answers from the message cache, which is also what makes poll votes readable. `messageCacheMax` (default 2000) sizes it; content only, never media bytes.
- **`msgRetryCounterCache`.** Baileys builds one per socket. This adapter rebuilds the socket on every reconnect, so a counter left to it resets each time and a message that can never be decrypted retries forever. The adapter keeps one for the life of the client instead.

Two more things it does on its own, because a reconnect otherwise loses them quietly:

- Presence subscriptions are re-sent after reconnecting. They last only as long as a connection, so without this `presenceUpdate` stops arriving after the first drop.
- The blocklist is tracked from `blocklist.set` and `blocklist.update`, which is what fills `contact.isBlocked`. It reads `undefined` until WhatsApp has sent it.

### The chat list, and what the adapter keeps

Baileys is a stateless socket by design: it reports what happens and stores nothing, and [its documentation](https://baileys.wiki/concepts/data-store) is explicit that keeping that state is the application's job. For NestWhats that layer is the adapter, so it does it — on by default, metadata only, never messages:

- `getChats()` lists direct conversations *and* groups. The groups are also asked for directly, so they are there before any history sync arrives.
- `chat.name`, `unreadCount`, `markedUnread`, `archived`, `pinned`, `muted`, `mutedUntil` and `lastMessageAt` come from it, and `getChat` on a known chat costs no round trip.
- `chatStore: false` turns it off, and then only groups can be listed and those fields read `undefined`. `chatStoreMax` (default 1000) bounds it, dropping the least recently active first — a history sync can deliver far more than anyone lists.

The store is built from `messaging-history.set`, `chats.upsert`, `chats.update` and `chats.delete`, so it is as complete as what WhatsApp has sent this session. It is not a database: it lives in memory, starts empty on boot and fills as history syncs, and a chat nobody has touched since may not be in it.

Messages are the other thing Baileys does not keep, and two operations need one:

- `revokeMessage(id)` works for a message seen since the client connected. For anything else, use `message.delete(true)` on the message itself.
- `sendSeen(chatId)` marks the chat read up to the last message *received* from it since the client connected. Nothing received yet means nothing to mark, and the call is a logged no-op.

`getChat` and `getContact` answer only as far as the socket can tell: a chat in the store, a phone number checked with WhatsApp, a LID through the mapping the socket has learned. Anything else is `undefined` rather than an invented object.

### Adapter options

`BaileysAdapterOptions` extends Baileys' own [`SocketConfig`](https://baileys.wiki/docs/socket/configuration) — `syncFullHistory`, `markOnlineOnConnect`, the timeouts, the caches, `getMessage` — with:

| Option | Type | Default | Description |
|---|---|---|---|
| `authDir` | `string` | `.baileys_auth` | Where credentials live. Each client keeps its own `session-<name>` folder inside it. |
| `phoneNumber` | `string` | — | Link by pairing code instead of QR: the number to link, with country code, punctuation ignored. |
| `printAuthData` | `boolean` | `true` | Prints the QR code — or the pairing code — in the terminal, prefixed with the client name. |
| `deviceName` | `string` | `Ubuntu` | What the phone shows under *Linked devices* as the device. |
| `browserName` | `string` | `Chrome` | The browser shown next to it. |
| `fetchLatestVersion` | `boolean` | `true` | Look up the current WhatsApp Web version before connecting; falls back to the one bundled with Baileys. Ignored when `version` is set. |
| `logLevel` | `silent` … `trace` | `error` | How much of Baileys' own logging reaches Nest's `Logger`. Ignored when a `logger` is given. |
| `passkey` | `PasskeyAssertionSigner` | — | Signs WhatsApp's passkey challenge, `(requestOptions, { clientName, phoneNumber })`. Set on the factory it serves every client. Without it the `passkeyChallenge` event is emitted instead. |
| `passkeyTimeoutMs` | `number` | `60000` | How long to wait for an answer to `passkeyChallenge`. |
| `rejectCalls` | `boolean` | `false` | Declines every incoming call as it arrives. |
| `chatStore` | `boolean` | `true` | Track the chat list from WhatsApp's own events. Off, only groups can be listed. |
| `chatStoreMax` | `number` | `1000` | How many chats to keep; least recently active dropped first. |
| `groupCache` | `boolean` | `true` | Cache group participant lists between sends. |
| `groupCacheTtlMs` | `number` | `300000` | How long a cached participant list stays good. |
| `messageCacheMax` | `number` | `2000` | How many messages to remember for resends, revokes, markers and poll votes. |

`auth` and `browser` are the adapter's to build and cannot be passed. `BaileysAdapterFactory` takes all of the above plus `id`, which names the factory (default `baileys`); give a second factory its own id to register the same platform twice with different configuration.

Credentials are never shared: every client's adapter loads `useMultiFileAuthState` from its own `session-<name>` folder inside `authDir`, in its own `initialize()`. Nothing in the shared configuration is an object that could carry state from one client to the next.

### Authenticating

By default a client shows a QR code. Set `phoneNumber` and it asks for an 8-digit pairing code instead, which the phone accepts under *Linked devices → Link with phone number*. The code is requested from inside Baileys' first `qr` update — the moment the socket is ready for it — and once per socket, since the QR refreshes every few seconds and each refresh would otherwise mint a new code.

Either way the value reaches handlers through `connectionUpdate` — as `qr` with `ClientStatus.QrReceived`, or as `pairingCode` with `ClientStatus.PairingCodeReceived` — and the dashboard shows whichever applies. In the dashboard this is a radio: picking **Pairing code** shows the phone number, picking **QR code** shows the QR settings; fields of the other mode are hidden and never submitted.

A successful pairing is reported as `authenticated`, followed by a `disconnected` with `kind: restart_required` — WhatsApp closes the socket after pairing — and `ready` on the reconnect. A restored session goes straight to `ready`.

### Pairing by passkey

Some accounts can no longer link a device by QR or pairing code alone: WhatsApp answers the pairing-code request with a WebAuthn challenge, and the link only completes once the account's **passkey** has signed it. Baileys knows nothing about this flow; the adapter speaks it in both authentication modes, and only needs a way to get the challenge signed — the passkey lives wherever the account holder keeps it, so that part is yours. There are two ways to provide it, and they can be combined.

**A signer on the factory.** One function, receiving the challenge and which client is asking, serves every client — including virtual ones created at runtime from the dashboard or `createClient`, whose options are persisted as JSON and could never carry a function. This is the fit for a backend that holds the passkeys in a vault:

```typescript
new BaileysAdapterFactory({
  authDir: '.baileys_auth',
  passkey: (requestOptions, { clientName, phoneNumber }) =>
    vault.sign(phoneNumber, requestOptions),
})
```

**The `passkeyChallenge` event.** With no signer configured, the challenge is emitted instead and the adapter waits (`passkeyTimeoutMs`, default 60s) for an answer. The payload carries `resolve`/`reject`, for a handler that can answer on the spot, and the same answer can arrive later through `resolvePasskey` on `BaileysMessagingService`, addressed by client name — which is what an HTTP endpoint has when the account holder's browser posts the assertion back:

```typescript
@BaileysOn('passkeyChallenge')
public onChallenge(@Context() [, challenge]: ContextOf<'passkeyChallenge', BaileysEvents>) {
  // push it to whoever holds the passkey; clientName says which session
  this.gateway.emit(`passkey:${challenge.clientName}`, challenge.requestOptions);
}

@Post('clients/:name/passkey')
public answer(@Param('name') name: string, @Body() assertion: WebAuthnAssertion) {
  this.messaging.resolvePasskey(assertion, { client: name });
}
```

`@nestwhats/dashboard` already does this: it listens for `passkeyChallenge` on any adapter that announces it, shows a **Use passkey** button on the client's card, signs with the browser's authenticator and answers through `resolvePasskey` — no code on your side. In your own page, `navigator.credentials.get({ publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(requestOptions) })` followed by `credential.toJSON()` produces exactly the `WebAuthnAssertion` shape (`rawId`, `response.clientDataJSON`, `authenticatorData`, `signature`, all base64url). `passkeyResult` reports how it ended — `ok`, or an `error` of `timeout` when WhatsApp never confirmed.

Everything else — the ephemeral identity, the nonce commitment, the encrypted pairing request — is the adapter's, in `PasskeyHandshake`. A challenge nobody answers only times out and is logged, so leaving both paths unconfigured costs nothing on accounts that do not need a passkey. The flow has been observed in the field on the pairing-code login; on a QR login it is wired identically (`phoneNumber` is then absent from the context) but has not been seen to fire — WhatsApp may simply never ask there, since the phone approves a QR itself.

> [!WARNING]
> Baileys 7.0.0-rc14 can abort a link-code or passkey pairing with `Invalid buffer` when WhatsApp sends a `link_code_companion_reg` notification without the pairing payload — upstream [PR #2681](https://github.com/WhiskeySockets/Baileys/pull/2681) makes it wait for the complete one and is not in rc14. If you hit it, apply that patch to your Baileys install.

### Linked device identity

`deviceName` and `browserName` genuinely work here — they become Baileys' `browser` triple through `Browsers.ubuntu(…)` — unlike in the whatsapp-web.js adapter, where WhatsApp Web dropped the module they were written through:

```typescript
new NestWhatsClientConfig(BaileysAdapterFactory, {
  name: 'business',
  options: { deviceName: 'Verso Business', browserName: 'Chrome' },
})
```

They are applied while pairing, so an already-linked client keeps its name until it links again.

### Logging

Baileys wants a pino-shaped logger. By default the adapter routes it into Nest's `Logger` under the context `Baileys:<client>`, filtered by `logLevel` (default `error`). Pass your own pino instance as `logger` to bypass that entirely.

## 📡 Platform events

Importing this package augments the NestWhats event map, so Baileys events work in `@On`/`@Once`/`ContextOf` with full typing. The `BaileysOn`/`BaileysOnce` decorators are also available with the same behavior and explicit platform typing:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Context, ContextOf, On } from 'nestwhats';
import { BaileysOn, type BaileysEvents } from '@nestwhats/platform-baileys';

@Injectable()
export class AppUpdate {
  private readonly logger = new Logger(AppUpdate.name);

  @BaileysOn('call')
  public onCall(@Context() [, calls]: ContextOf<'call', BaileysEvents>) {
    this.logger.log(`Incoming call from ${calls[0]?.from}`);
  }

  @On('groupParticipantsUpdate')
  public onParticipants(@Context() [, update]: ContextOf<'groupParticipantsUpdate'>) {}
}
```

Native names are spelled in camelCase — `messages.upsert` is `messagesUpsert`, `message-receipt.update` is `messageReceiptUpdate` — and each carries Baileys' own payload, untouched: the `messages` inside `messagesUpsert` are `WAMessage`s, not `BaileysMessage`s. The portable `messageUpsert` is where the wrapped one arrives.

Two native events are **not** forwarded under their own name, because their NestWhats spelling is taken by a portable event with a different shape: `connection.update` is the source of `connectionUpdate`, and `presence.update` the source of `presenceUpdate`. The raw update stays reachable through `raw.ev`.

`call` is emitted and typed through `@BaileysOn`, but left out of the global `@On` augmentation: the whatsapp-web.js package declares an event of the same name with its own payload, and two augmentations disagreeing on one property would be a compile error in any application that installs both platforms.

Adapter-only events, from no Baileys event: `passkeyChallenge`, `passkeyResult`, and `pollVote` — WhatsApp encrypts each vote against the poll it answers, so the adapter decrypts it and reports the whole tally, which only works while that poll is still in the message cache.

Platform-specific events: `credsUpdate`, `messagingHistorySet`, `messagingHistoryStatus`, `chatsUpsert`, `chatsUpdate`, `lidMappingUpdate`, `chatsDelete`, `contactsUpsert`, `contactsUpdate`, `messagesDelete`, `messagesUpdate`, `messagesMediaUpdate`, `messagesUpsert`, `messagesReaction`, `messageReceiptUpdate`, `groupsUpsert`, `groupsUpdate`, `groupParticipantsUpdate`, `groupJoinRequest`, `groupMemberTagUpdate`, `blocklistSet`, `blocklistUpdate`, `call`, `labelsEdit`, `labelsAssociation`, `newsletterReaction`, `newsletterView`, `newsletterParticipantsUpdate`, `newsletterSettingsUpdate`, `messageCappingUpdate`, `chatsLock`, `settingsUpdate`.

### The portable events, derived

- `messageUpsert` is derived from `messages.upsert` with `type: 'notify'` only. `append` is what history sync and the echo of this socket's own sends arrive as — replaying a synced history through `messageUpsert` would run every command in it again. Reactions, poll votes and protocol traffic other than a revoke are skipped too; a revoke arrives with `type: revoked`.
- `messageStatus` is derived from `messages.update` and `message-receipt.update`, mapping `WebMessageInfo.Status` onto the portable statuses. In a group, `messages.update` is trusted only up to `sent` — Baileys advances its aggregate as soon as the first recipient answers — and the per-recipient `delivered`/`read`/`played` come from the receipts, with `participantId` filled in.
- `presenceUpdate` is one event per participant in Baileys' `presence.update`, with `lastSeen` (seconds) turned into `lastSeenAt` (milliseconds). Absent means privacy hides it, not that the contact was never seen.

## ✉️ Messaging

Everything portable is reached through the core `NestWhatsMessagingService`, so nothing here needs a platform-specific service:

```typescript
import { Injectable } from '@nestjs/common';
import { NestWhatsMessagingService, PresenceState } from 'nestwhats';

@Injectable()
export class StoryService {
  public constructor(private readonly messaging: NestWhatsMessagingService) {}

  public async goodMorning() {
    await this.messaging.postStatus('bom dia', { audience: ['5511999998888@user'] }, { client: 'personal' });
    await this.messaging.subscribePresence('5511999998888@user', { client: 'personal' });
  }
}
```

> [!IMPORTANT]
> `postStatus` requires `audience` here. WhatsApp encrypts a status for the ids it is given, and posting without them reaches nobody while looking like a success — so the adapter refuses instead.

`BaileysMessagingService` is only the escape hatch: it adds `sendRaw`, which takes Baileys' full `AnyMessageContent` and `MiscMessageGenerationOptions` — polls, events, albums, locations, contact cards — for the things Baileys alone offers:

```typescript
await this.messaging.sendRaw(chatId, { poll: { name: 'Almoço?', values: ['Sim', 'Não'] } });
```

## 🔓 Raw access

The NestWhats structures cover what every platform can honour. Everything else Baileys offers lives on `raw`, typed as the native object, with no cast:

| Structure | `raw` type |
|-----------|------------|
| `BaileysMessage` | `WAMessage` |
| `BaileysChat` | `GroupMetadata` for a group, Baileys' `Chat` for a direct one from the store, `undefined` when neither is known |
| `BaileysContact` | `Contact` |
| `BaileysNewsletter` | `NewsletterMetadata` |
| `BaileysAdapter` | `WASocket` — available once `initialize()` has built it |

```typescript
@Command({ name: "raw" })
async onRaw(@Message() msg: BaileysMessage) {
  msg.body;                 // portable contract
  msg.raw.pushName;         // Baileys, typed
  msg.raw.key.remoteJid;    // 5511999@s.whatsapp.net
}
```

Type the parameter as `BaileysMessage` (not `NestWhatsMessage`) to get the native typings. A handler that must stay platform-agnostic keeps `NestWhatsMessage` and sticks to the contract.

## 🧭 Neutral ids

Ids cross the adapter boundary normalised, so what your app stores survives a change of platform:

| NestWhats | Baileys |
|-----------|---------|
| `5511999@user` | `5511999@s.whatsapp.net` |
| `123-456@group` | `123-456@g.us` |
| `789@lid` | `789@lid` |
| `status@broadcast` | `status@broadcast` |
| `1@newsletter` | `1@newsletter` |

The `:device` part is dropped (`5511999:12@s.whatsapp.net` → `5511999@user`), and whatsapp-web.js' `@c.us` is recognised on the way in. `sendMessage`, `getChat` and `getContact` accept either form. The native id is always on `raw`.

## 🔄 Staying in sync with Baileys

Disconnects map the `DisconnectReason` code on the Boom Baileys attaches to a `close` onto the portable kinds — `loggedOut` (401) becomes `logged_out`, `restartRequired` (515) `restart_required`, `forbidden` (403) `forbidden`, `connectionLost`/`timedOut` (408) `connection_lost`, `connectionReplaced` (440) `conflict`, `badSession` (500) `auth_failure` — with the code in `reason.code` and Baileys' wording in `reason.message`. On `loggedOut` the session folder is cleared, so the next `initialize()` asks for a QR instead of closing again with the same code.

Baileys declares its events as a type with no runtime enum behind it, so the native list lives in `BAILEYS_EVENTS` — and a compile-time check makes an omission loud: adding an event upstream without listing it here fails the build naming the event. The argument types are derived from `BaileysEventMap`, so they follow the dependency without anyone editing a map.

```
error TS2344: Type '"newsletter.join"' does not satisfy the constraint 'true'.
```

## ⚠️ Things WhatsApp is particular about

Learned from [Baileys' own documentation](https://baileys.wiki), and worth knowing before they bite:

- **Voice notes need Opus.** Send audio as mono Ogg/Opus (`ffmpeg -i in.mp4 -c:a libopus -ac 1 -avoid_negative_ts make_zero out.ogg`) or it will not play on some devices. Set the mimetype to `audio/ogg; codecs=opus`.
- **A malformed chat modification can log the account out of every device.** That is why `archive`, `markRead`, `clearMessages` and `delete` refuse without a marker rather than sending something incomplete.
- **Appearing online silences the phone.** WhatsApp treats a connected client as the active session, so the paired phone stops getting push notifications. `markOnlineOnConnect: false` avoids it.
- **History depends on the device identity.** A desktop `deviceName` makes WhatsApp send considerably more history than a mobile one; `syncFullHistory` decides how much of it is asked for, at the cost of startup time and memory.
- **Media expires on WhatsApp's servers.** `message.downloadMedia()` asks the phone to re-upload once and answers `undefined` when even that fails, rather than throwing.
- **Invite codes are codes, not URLs.** Pass the part after `chat.whatsapp.com/`.

## 📖 License

[GPL-3.0 License](https://github.com/NedcloarBR/NestWhats/blob/master/License)
