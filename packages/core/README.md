<h1 align="center">
  <br>
  <img width="35" src="https://github.com/NedcloarBR/NestWhats/blob/master/assets/logo.png?raw=true"> NestWhats
  <br>
</h1>

<h3 align="center">An adapter-based <b><a href="https://nestjs.com">NestJS</a></b> framework to work with <b><a href="https://www.whatsapp.com/">WhatsApp</a></b></h3>

<p align="center">
  <a href="https://github.com/NedcloarBR/NestWhats/blob/master/License">
    <img src="https://img.shields.io/github/license/NedcloarBR/NestWhats" alt="License">
  </a>
  <a href="https://www.npmjs.com/package/nestwhats">
    <img src="https://img.shields.io/npm/v/nestwhats" alt="npm version">
  </a>
  <a href="https://nedcloarbr.github.io/NestWhats/docs/intro">
    <img src="https://img.shields.io/badge/docs-nestwhats-c11e43" alt="Documentation">
  </a>
</p>

<p align="center">
  <b><a href="https://nedcloarbr.github.io/NestWhats/docs/intro">Read the documentation</a></b>
</p>

## ❓ About

NestWhats is a NestJS framework for working with WhatsApp — a bot, the messages a product has to send, or anything in between. Since v4 the core is **platform-agnostic**: it defines neutral structures (`NestWhatsMessage`, `NestWhatsChat`, `NestWhatsContact`) and an adapter contract, while platform packages connect to an actual WhatsApp library — similar to how NestJS itself works with Express/Fastify adapters.

Available adapters:

| Adapter | Package |
|---------|---------|
| [whatsapp-web.js](https://wwebjs.dev/) | [`@nestwhats/platform-whatsapp-web.js`](https://www.npmjs.com/package/@nestwhats/platform-whatsapp-web.js) |

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

### Single client

Register a global adapter instance — name defaults to `default` and prefix to `!`:

```typescript
import { Module } from '@nestjs/common';
import { NestWhatsModule } from 'nestwhats';
import { WhatsAppWebJsAdapterFactory } from '@nestwhats/platform-whatsapp-web.js';
import { LocalAuth } from 'whatsapp-web.js';

@Module({
  imports: [
    NestWhatsModule.forRoot({
      adapter: new WhatsAppWebJsAdapterFactory({
        authStrategy: new LocalAuth(),
      }),
    }),
  ],
  providers: [AppUpdate],
})
export class AppModule {}
```

### Async configuration

`forRootAsync` takes the three standard NestJS forms — `useFactory`, `useClass`
and `useExisting`:

```typescript
NestWhatsModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    adapter: new WhatsAppWebJsAdapterFactory({
      authStrategy: new LocalAuth({ clientId: config.get('CLIENT_ID') }),
    }),
  }),
  inject: [ConfigService],
})
```

With `useClass` the module instantiates the configuration class for you, so it
does not have to be provided anywhere else:

```typescript
@Injectable()
export class NestWhatsConfig implements NestWhatsOptionsFactory {
  public constructor(private readonly config: ConfigService) {}

  public createNestWhatsOptions(): NestWhatsModuleOptions {
    return {
      adapter: new WhatsAppWebJsAdapterFactory({
        authStrategy: new LocalAuth({ clientId: this.config.get('CLIENT_ID') }),
      }),
    };
  }
}

NestWhatsModule.forRootAsync({ imports: [ConfigModule], useClass: NestWhatsConfig });
```

`useExisting` takes the same class when it is already provided by a module you
import, and reuses that instance instead of creating a second one.

For anything other than a single client called `default`, pass `clientNames`
alongside the configuration:

```typescript
NestWhatsModule.forRootAsync({
  clientNames: ['personal', 'support'],
  useClass: NestWhatsConfig,
})
```

It is required, not a convenience: the injection tokens have to exist while the
module is being defined, and the configuration only exists after the factory has
run — so the module cannot learn the names from it. Leaving `clientNames` out
while the configuration declares a client under another name fails at startup,
naming what it did declare.

## 📡 Events

Handle events with `@On`/`@Once`. The context tuple always starts with the `NestWhatsClient` that fired the event:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Context, ContextOf, On, Once } from 'nestwhats';

@Injectable()
export class AppUpdate {
  private readonly logger = new Logger(AppUpdate.name);

  @Once('ready')
  public onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`${client.name} logged in as ${client.getInfo()?.displayName}`);
  }

  @On('messageUpsert')
  public onMessage(@Context() [client, message]: ContextOf<'messageUpsert'>) {
    this.logger.log(`[${client.name}] ${message.senderId}: ${message.body}`);
  }
}
```

Base events, available on every adapter:

| Event | Payload | Source |
|-------|---------|--------|
| `messageUpsert` | `NestWhatsMessage` | adapter |
| `connectionUpdate` | `ConnectionUpdate` | adapter |
| `qr` | `string` | derived |
| `pairingCode` | `string` | derived |
| `authenticated` | — | derived |
| `ready` | — | derived |
| `disconnected` | `DisconnectReason` | derived |

The adapter emits only the first two; the core derives the rest from `connectionUpdate` (see [Writing an adapter](#-writing-an-adapter)). `messageUpsert` carries every message the platform surfaces, sent or received — filter with `message.fromMe`, or set `ignoreSelf` to drop your own before commands run.

Platform packages add their own events via module augmentation — after importing the platform package, platform-specific events are available in `@On`/`ContextOf` with full typing. See the platform package README for the list and for typed decorators like `WWebJsOn`.

### Event options

| Option   | Type                   | Description                                              |
|----------|------------------------|----------------------------------------------------------|
| `client` | `string \| string[]`   | Client name(s) that should trigger this listener. When omitted, all clients trigger it. |

## 👥 Multiple Clients

Declare one factory per platform in `adapters`, and any number of clients built from it. The factory holds the configuration they share; each client gets its own adapter, and its own connection:

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
          authStrategy: new LocalAuth(), // clientId is filled with each client name
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

The class is the token tying the two together, so nothing has to be assigned to a variable outside the decorator — and naming it is what types that client's `options` against the factory that will receive them:

```typescript
new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, {
  name: 'business',
  options: { pairWithPhoneNumber: { phoneNumber: '5511999998888' } },
  //         ^ checked; a typo here fails the build
})
```

`adapters` also takes the class on its own, which builds it with its defaults:

```typescript
NestWhatsModule.forRoot({
  adapters: [WhatsAppWebJsAdapterFactory],
  clients: [new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, { name: 'personal' })],
})
```

A client that passes no options can skip the wrapper entirely, and skip naming its adapter when only one is registered:

```typescript
clients: [{ name: 'personal', prefix: '!' }]
```

With several factories registered, name one by class, by instance, or by id — an id is what a client restored from storage carries, and the only form that leaves `options` loose:

```typescript
NestWhatsModule.forRoot({
  adapters: [WhatsAppWebJsAdapterFactory, BaileysAdapterFactory],
  clients: [
    new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, { name: 'personal' }),
    new NestWhatsClientConfig(BaileysAdapterFactory, { name: 'business' }),
  ],
})
```

Inject a specific client with `@InjectClient(name)`. A `NestWhatsClient` is everything about one client: how it was configured, what it can do, what it sends, and what it emits.

```typescript
constructor(
  @InjectClient('personal')
  private readonly client: NestWhatsClient<WhatsAppWebJsAdapterOptions>,
) {}
```

**How it was configured.** `options` is what this client was built with — its own, merged over the factory's — so a handler reads it without reopening the module. Naming the adapter's option type is what gets it without a cast:

```typescript
this.client.options.pairWithPhoneNumber?.phoneNumber;
this.client.platform?.label;   // 'WhatsApp Web.js'
this.client.adapterId;         // 'whatsapp-web.js'
this.client.name;              // 'personal'
```

**Sending.** `sendMessage` takes text or media; the rest are gated by what the platform implements, and calling one it lacks rejects with the capability named:

```typescript
await this.client.sendMessage(chatId, 'oi');
await this.client.sendMessage(chatId, { data, mimetype: 'image/png', caption: 'olha' });
await this.client.sendPresence(chatId, PresenceState.Typing);
await this.client.sendSeen(chatId);
await this.client.revokeMessage(messageId);
await this.client.logout();
```

**Asking.** `getChats()`, `getChat(id)` and `getContact(id)` are capability-gated the same way. Ask before you call when the answer should change what you do:

```typescript
if (this.client.supports(AdapterCapability.ListChats)) {
  const chats = await this.client.getChats();
}
```

**Events.** `on` returns the function that unsubscribes; `once` and `off` are there too. Whether an event lives on the core (the derived ones) or on the adapter (everything the platform owns) is decided for you:

```typescript
const stop = this.client.on('ready', () => this.logger.log('connected'));
this.client.once('messageUpsert', (message) => { /* … */ });
stop();
```

`NestWhatsMessagingService` has the same sending and asking surface, resolving a client by name first. Use it when the client is chosen at runtime, and the injected client when it is not — both refuse an unsupported operation in the same words.

`adapter` and `raw` stay available for anything the contract does not cover.

```typescript
import { Injectable } from '@nestjs/common';
import { InjectClient, NestWhatsClient } from 'nestwhats';

@Injectable()
export class MyService {
  public constructor(
    @InjectClient('personal') private readonly personal: NestWhatsClient,
    @InjectClient('business') private readonly business: NestWhatsClient,
  ) {}

  public async sendFromBusiness(chatId: string, text: string) {
    await this.business.sendMessage(chatId, text);
  }
}
```

## 📜 Commands

Register a command handler with the `@Command` decorator. Matching is case-insensitive.

```typescript
import { Injectable } from '@nestjs/common';
import { Args, Author, Client, Command, Message, NestWhatsClient, NestWhatsMessage } from 'nestwhats';

@Injectable()
export class BotUpdate {
  @Command({ name: 'ping', description: 'Replies with pong' })
  public async ping(
    @Message() message: NestWhatsMessage,
    @Client() client: NestWhatsClient,
  ) {
    await message.reply(`pong! (via ${client.name})`);
  }

  @Command({ name: 'echo', description: 'Echoes the arguments' })
  public async echo(@Message() message: NestWhatsMessage, @Args() args: string[]) {
    await message.reply(args.join(' '));
  }

  @Command({ name: 'hello', description: 'Greets the author', aliases: ['hi', 'hey'] })
  public async hello(@Author() author: string) {
    console.log(`Hello, ${author}!`); // author is the sender id
  }
}
```

### Command groups and subcommands

```typescript
import { Injectable } from '@nestjs/common';
import { CommandGroup, GroupDefault, Message, NestWhatsMessage, Subcommand } from 'nestwhats';

@CommandGroup({ name: 'admin', description: 'Admin commands' })
@Injectable()
export class AdminUpdate {
  @GroupDefault()
  public async fallback(@Message() message: NestWhatsMessage) {
    await message.reply('Unknown admin command.');
  }

  @Subcommand({ name: 'status', description: 'Show bot status' })
  public async status(@Message() message: NestWhatsMessage) {
    await message.reply('Bot is running ✓');
  }
}
```

### Command options

| Option        | Type                   | Description                                                               |
|---------------|------------------------|---------------------------------------------------------------------------|
| `name`        | `string`               | The command name (matched after the prefix, case-insensitive)             |
| `description` | `string`               | A short description of the command                                        |
| `aliases`     | `string[]`             | Additional names that trigger the same command                            |
| `prefix`      | `string`               | Overrides the client prefix for this command only                         |
| `client`      | `string \| string[]`   | Client name(s) that should handle this command. When omitted, all clients handle it. |

### ParseArgsPipe

`ParseArgsPipe` requires `class-transformer` and `class-validator`, which are optional peer dependencies. Install them only if you use the pipe:

```bash
$ npm i class-transformer class-validator
$ yarn add class-transformer class-validator
$ pnpm add class-transformer class-validator
```

## ✉️ Messaging

`NestWhatsMessagingService` is available everywhere and works with any adapter. It resolves a client by name, then does what an injected `NestWhatsClient` does directly — reach for this one when the client is chosen at runtime:

```typescript
import { Injectable } from '@nestjs/common';
import { NestWhatsMessagingService } from 'nestwhats';

@Injectable()
export class NotifierService {
  public constructor(private readonly messaging: NestWhatsMessagingService) {}

  public async notify(chatId: string, text: string) {
    await this.messaging.sendMessage(chatId, text, { client: 'personal' });
  }
}
```

Media, presence, read receipts, revokes and chat listing are portable too — they are gated by the adapter's capabilities rather than by which package you imported:

```typescript
import { AdapterCapability, PresenceState } from 'nestwhats';

await this.messaging.sendPresence(chatId, PresenceState.Typing);
await this.messaging.sendMedia(chatId, {
  data: await readFile('report.pdf'),
  mimetype: 'application/pdf',
  filename: 'report.pdf',
  caption: 'this month',
});
await this.messaging.sendSeen(chatId);
await this.messaging.revokeMessage(messageId);

const chats = await this.messaging.getChats();
await this.messaging.logout({ client: 'personal' });
```

Calling one the adapter does not announce throws with a message that names the capability, so a feature missing on a platform fails loudly at the call instead of quietly doing nothing. Ask first when the answer should change what you do:

```typescript
if (this.messaging.supports(AdapterCapability.SendMedia)) { /* … */ }
```

Platform packages still extend the service with whatever is theirs alone.

## 🔓 Raw access

The core structures are deliberately a **contract, not a mirror**: they carry only what every platform can honour, so commands, guards and listeners stay portable. Anything a platform offers beyond that — and anything it adds in a future release — is reachable through `raw`, untouched.

`NestWhatsMessage`, `NestWhatsChat` and `NestWhatsContact` take the native type as a generic parameter, so a platform class types `raw` precisely:

```typescript
// core — portable, raw is unknown
async handle(@Message() message: NestWhatsMessage) {
  message.body;   // contract
}

// platform — raw is the whatsapp-web.js Message, no cast
async handle(@Message() message: WWebJsMessage) {
  message.body;             // same contract
  message.raw.deviceType;   // native, typed
}
```

This is why the core never has to grow a field every time a platform library does.

## 🔌 Writing an adapter

An adapter emits **two** events. That is the whole contract:

```typescript
interface NestWhatsAdapterEvents {
  connectionUpdate: [update: ConnectionUpdate];
  messageUpsert: [message: NestWhatsMessage];
}

interface ConnectionUpdate {
  status: ClientStatus;
  qr?: string;          // platforms that authenticate by QR
  pairingCode?: string; // platforms that pair by phone code
  reason?: DisconnectReason; // why it closed
}
```

The core derives `qr`, `pairingCode`, `authenticated`, `ready` and `disconnected` from `connectionUpdate`, so handlers keep the ergonomic names and the adapter never tracks which of them it already emitted — status events fire only on a real transition, which matters for platforms that repeat their state on reconnect.

Every field but `status` is optional, so a platform reports what it actually has: whatsapp-web.js sends a QR, Baileys can send a QR *or* a pairing code, and the official Cloud API sends neither and simply starts out `Ready`.

Anything a platform offers beyond the contract is its own vocabulary, declared through module augmentation:

```typescript
declare module "nestwhats" {
  interface NestWhatsBaseEvents extends MyPlatformEvents {}
}
```

### The factory

A platform package ships **two** things: the adapter, which is one client's
connection, and a `NestWhatsAdapterFactory`, which holds the configuration they
share and builds one adapter per client. `adapters` in `forRoot` takes the
factory, never the adapter.

```typescript
export class MyAdapterFactory implements NestWhatsAdapterFactory<MyAdapter, MyOptions> {
  public readonly id = 'my-platform';
  public readonly platform = MY_PLATFORM;          // badge for a UI
  public readonly optionsSchema = MY_OPTIONS_SCHEMA; // form fields for a UI

  public constructor(private readonly config: MyOptions = {}) {}

  public create(clientName: string, options?: MyOptions): MyAdapter {
    return new MyAdapter({ ...this.config, ...options }, clientName);
  }
}
```

Three things follow from the split, and they are the reason for it:

- **Nothing identifying is ever shared.** Credentials and session directories
  are derived inside `create`, from `clientName` or from that client's own
  `options`. There is no template object holding mutable state for two clients
  to fight over.
- **A platform can demand something per client and say so at boot.** The
  official Cloud API needs a distinct phone number id for each; `create` throws
  naming the client, rather than quietly starting two clients on one account.
- **`platform` and `optionsSchema` describe the platform, not a connection,** so
  a dashboard renders the form and the badge before any client exists.

`id` is how a client names the factory, and it is what gets written to storage
for a virtual client — so it has to survive a restart and a minifier. Register
the same platform twice by giving the second factory its own id.

### Module format

The package is ESM only. An adapter package should be too — one build means one
copy of its classes in a process, which is what keeps `instanceof` and DI
tokens behaving. A CommonJS application still consumes both through
`require(esm)` on Node 20.19+.

Two rules an adapter has to honour:

- **No top-level await.** `require()` refuses an asynchronous module, so one
  `await` at the top of one published file breaks every CommonJS consumer.
- **Anything a consumer might hold across a package boundary — an injection
  token, a metadata key — goes through `Symbol.for`,** never a plain `Symbol()`
  or a class reference. A plain symbol and a class object are created once per
  evaluated copy of the module that declares them, so they diverge; a registry
  symbol resolves by key and survives.

If the platform library is CommonJS, check what Node actually gives you from an
ES module before trusting a named import — detection is partial, and the missing
names arrive as `undefined` with no error until something reads them.
`@nestwhats/platform-whatsapp-web.js` hit exactly this and centralises the
interop in one file, re-exporting the values so its own consumers never have to.

### Capabilities

The mandatory contract is what every platform can honour: connect, disconnect,
emit events, say who it is, send text. Everything else is optional, because
platforms genuinely differ — the official Cloud API has no way to fetch a chat
or a contact, whatever the onboarding.

An adapter implements what its platform can do, and that *is* the declaration:

```typescript
export class MyAdapter extends EventEmitter implements NestWhatsAdapter<MyClient> {
  // mandatory
  public async sendMessage(chatId: string, content: string) { /* … */ }

  // optional — implementing it is what announces AdapterCapability.Presence
  public async sendPresence(chatId: string, state: PresenceState) { /* … */ }
}
```

`supportsCapability(adapter, AdapterCapability.Presence)` reads the method, so
there is no second list to keep in sync and nothing to forget. Calling one the
platform lacks rejects with the capability named, instead of failing obscurely
somewhere in the library.

| Capability | Adapter method | What it covers |
|---|---|---|
| `sendMedia` | `sendMedia` | Attachments, not only text |
| `presence` | `sendPresence` | Typing and recording indicators |
| `readReceipts` | `sendSeen` | Marking a chat as read |
| `revoke` | `revokeMessage` | Deleting for everyone |
| `listChats` | `getChats` | Listing conversations |
| `readChat` | `getChat` | Fetching one conversation |
| `readContact` | `getContact` | Fetching one contact |
| `logout` | `logout` | Dropping the credentials |
| `createGroup` | `createGroup` | Starting a group |
| `readAbout` | `getAbout` | Reading someone's profile text ("recado") |
| `setAbout` | `setAbout` | Changing your own profile text |
| `setProfileName` | `setProfileName` | Changing your display name |
| `setProfilePicture` | `setProfilePicture` | Changing your photo |
| `block` | `setBlocked` | Blocking and unblocking |
| `postStatus` | `postStatus` | Publishing to status/stories |
| `subscribePresence` | `subscribePresence` | Being told when a contact comes and goes |

The split is not "strong platform, weak platform". A browser session does
groups and profile text but cannot post a status or watch presence; a socket
platform does both. The official Cloud API has none of them, and cannot address
a group at all.

### The vocabulary is open

That table is the core's own; it is not the whole list. A platform package adds
its capabilities the same way it adds events — the core does not have to know
the feature exists:

```typescript
declare module "nestwhats" {
  interface AdapterCapabilities {
    template: "sendTemplate";
  }
}

registerCapability('template', 'sendTemplate');
```

The augmentation is the type side and vanishes at build; `registerCapability`
is the runtime side. Call it at module load in your package, so importing it is
all a consumer has to do. After that, `client.supports('template')` is checked
at compile time and derived at runtime exactly like a built-in one, `unsupported`
can switch it off, and it shows up in the dashboard.

`AdapterCapability` is both the union type and an object of the core's own
names, so `AdapterCapability.SendMedia` and `'sendMedia'` are the same value —
use whichever reads better. Enumerate with `getKnownCapabilities()`, which
includes what the loaded platform packages registered;
`Object.values(AdapterCapability)` answers a narrower and usually wrong
question.

### When the method is there but unusable

Support is derived from the method existing. `unsupported` takes some away, for
the case where implementing something is not the same as being able to use it —
the same adapter class serving an account onboarded one way can do less than one
onboarded another, and only the instance knows:

```typescript
export class MetaCloudAdapter implements NestWhatsAdapter<MetaClient> {
  public readonly unsupported = new Set([AdapterCapability.ListChats]);
  // …still implements getChats, for the onboarding that allows it
}
```

It can only subtract. There is deliberately no way to claim a capability without
implementing it, and — the reason it is a deny-list rather than the full set —
a capability added to the core later stays derived for every adapter instead of
being silently reported as missing by the ones that declared an override.

### Refusals are typed

Calling an unsupported capability rejects with a `CapabilityNotSupportedError`,
so portable code branches on a field instead of parsing a message:

```typescript
try {
  await client.postStatus('good morning');
} catch (err) {
  if (err instanceof CapabilityNotSupportedError) {
    this.logger.warn(`${err.platform ?? err.client} cannot ${err.capability}`);
    return;
  }
  throw err;   // a real failure on the wire
}
```

It extends `NestWhatsError`, which every error the library raises itself does —
catching that separates "NestWhats refused" from "the platform failed".

### Refusing before the handler runs

Better than catching is not starting. `RequiresCapability` skips a handler on a
client whose adapter cannot do what it needs, so the bot stays quiet on that
platform instead of answering halfway and failing:

```typescript
@Command({ name: 'story' })
@UseGuards(RequiresCapability(AdapterCapability.PostStatus))
public async onStory(@Message() message: NestWhatsMessage) {
  // reached only where postStatus exists
}
```

It takes several, and requires all of them. The refusal is logged once per
handler per client — a guard denying is ordinary flow, not an error, so it never
reaches your logs as one.

### Delivery status

`messageStatus` reports how far a sent message got. Every platform has it, and
on the official Cloud API it is the *only* way to learn a send failed — the call
itself answers with an id and nothing else:

```typescript
@On('messageStatus')
public onStatus(@Context() [, update]: ContextOf<'messageStatus'>) {
  if (update.status === MessageStatus.Failed) {
    this.logger.error(`${update.messageId}: ${update.error?.message}`);
  }
}
```

The statuses are `pending`, `sent`, `delivered`, `read`, `played` and `failed`.
They read as a progression but should not be compared as one: a platform may
skip a step, and `failed` is not a stage. In a group, `participantId` says whose
status this is — one message collects one per recipient.

It is emitted by the adapter rather than derived, so an adapter that cannot
report it leaves it out of `supportedEvents` and subscribing is refused instead
of silently never firing.

### Groups

Creating a group is an adapter capability, because there is no group to ask
yet. Managing one belongs to the chat, where the answer already lives:

```typescript
const chat = await client.getChat(chatId);

if (chat?.addParticipants) {
  await chat.addParticipants(['5511999998888@user']);
  await chat.promoteParticipants(['5511999998888@user']);
  await chat.setSubject('Novo nome');
  const code = await chat.getInviteCode();   // chat.whatsapp.com/<code>
}
```

A direct chat leaves every one of them undefined, so `if (chat.addParticipants)`
answers per chat rather than per platform — which is what you actually need.
Being an admin is a separate question, answered by the platform at call time.

`chat.description` reads the group's description, the counterpart to
`setDescription`.

### Editing and forwarding

Both are optional members on the message, answered the same way:

```typescript
const edited = await message.edit?.('texto corrigido');
if (!edited) {
  // Not a failure: the message is not this account's, or WhatsApp's edit
  // window (about 15 minutes) has closed. Both are ordinary answers.
}

await message.forward?.(otherChatId);
```

Editing replaces text and captions only — media cannot be swapped.

### Presence and "last seen"

Presence is push wherever it exists: you subscribe, and the answers arrive as
events. There is no `getLastSeen(id)` because no platform has one.

```typescript
await client.subscribePresence(contactId);   // requires SubscribePresence

client.on('presenceUpdate', ({ contactId, state, lastSeenAt }) => {
  if (state === PresenceState.Unavailable && lastSeenAt) {
    this.logger.log(`last seen at ${new Date(lastSeenAt).toISOString()}`);
  }
});
```

`lastSeenAt` is absent far more often than present — WhatsApp hides it by
default. Treat its absence as "not visible", never as "never seen". A
subscription lasts as long as the connection, so resubscribe on `ready`.

Structures work the same way: `message.react`, `message.downloadMedia`,
`message.getChat`, `chat.getParticipants` are optional members, and the check is
the member itself.

```typescript
const media = await message.downloadMedia?.();
```

Handlers written for one platform should type against that platform's class —
`WWebJsMessage` declares those methods concretely, so nothing is optional there.
The portable `NestWhatsMessage` is for code meant to run on any adapter.

Declare `capabilities` only when having the method is *not* the same as being
able to use it — a single class whose support depends on how the account was
onboarded, for instance. Then the set wins over the methods, and it has to be
honest: declaring a capability whose method is missing makes every call to it
fail at runtime.

### Disconnects

`disconnected` carries a `DisconnectReason`, not a string, so a handler can act without parsing platform wording:

```typescript
@On('disconnected')
public onDisconnected(@Context() [client, reason]: ContextOf<'disconnected'>) {
  if (isTerminalDisconnect(reason)) alertSomeone(client.name);  // logged out
  // otherwise the platform reconnects on its own
}
```

`kind` is one of `logged_out`, `auth_failure`, `restart_required`, `forbidden`, `connection_lost`, `conflict`, `unknown`; `code` and `message` keep the platform's own wording for logs.

Platforms that reconnect on their own drop and recover within seconds, and announcing every blip hands handlers a `disconnected`/`ready` pair for something that never went away. `disconnectDebounceMs` holds the announcement:

```typescript
NestWhatsModule.forRoot({ /* … */ disconnectDebounceMs: 30_000 })
```

A reconnect inside the window cancels it, and the matching `ready` is swallowed too — a flap becomes invisible rather than half-reported. A logout or auth failure always announces immediately, since no reconnect is coming. The default is `0` (announce immediately); the registry and the dashboard always reflect the drop straight away regardless.

### Reconnecting

Libraries disagree on who owns reconnection, so the core stays out of it unless asked:

```typescript
NestWhatsModule.forRoot({ /* … */ reconnect: {} })
```

With `reconnect` set, a client that drops is brought back on a backoff decided by the `DisconnectKind`: one second doubling to a minute for a lost connection, straight back for an expected restart, a five-minute cooldown when the platform is refusing the account, and never after a logout or an auth failure — nothing there can be fixed by trying again. A client that recovered on its own before the timer fired is left alone.

Leave it off for platforms that reconnect internally, or the two will race. `ReconnectPolicy` and `ReconnectRunner` are exported for adapters that would rather own the loop themselves.

### Phone numbers

Brazilian mobile numbers gained a leading `9`, and WhatsApp is inconsistent about which form a contact answers on. `brazilianPhoneVariants` returns the forms worth trying, original first:

```typescript
brazilianPhoneVariants('5531988887777'); // ['5531988887777', '553188887777']
brazilianPhoneVariants('553188887777');  // ['553188887777', '5531988887777']
brazilianPhoneVariants('14155552671');   // ['14155552671']
```

### Virtual clients and persistence

Clients come in two kinds, both owned by the core:

- **Declared** in `forRoot` — wired at boot, live for the process, never persisted.
- **Virtual** — created at runtime through `NestWhatsClientManagerService.createClient`, and destroyed with `destroyClient`.

Creating one is typed by the adapter you name, the same way `NestWhatsClientConfig` is — so an adapter option is checked rather than silently ignored:

```typescript
await clientManager.createClient({
  name: 'business',
  adapter: wwebjs,
  options: { deviceName: 'Verso Business', browserName: 'Chrome' },
  prefix: '.',
});
```

Naming the adapter by its id instead (`adapter: 'whatsapp-web.js'`) is how a restored client arrives — an object reference cannot be written to a file; it cannot be checked at compile time and `options` stays loose. Omitting `adapter` works when a single one is registered.

`updateClient` changes one afterwards. `prefix` is applied in place; `options` cannot be, so the client is recreated — briefly disconnected, but not logged out:

```typescript
await clientManager.updateClient('business', { prefix: '#' });              // live
await clientManager.updateClient('business', { options: { deviceName } });  // recreates
```

An adapter can declare a `platform` — id, label, and an inline SVG — which a UI shows next to each client so several adapters are told apart at a glance. Use the **library's own logo**, not WhatsApp's — every adapter here talks to WhatsApp, so its logo would make them all look alike; what differs is which library is behind the client. It comes from the adapter, not from `getInfo()`, so it is known before a client is up, and a platform with a `label` but no `icon` falls back to its initial.

Inlining several logos on one page has two catches worth handling in your adapter: namespace any `id` inside the SVG (bare ids like `a` collide), and drop filters and other detail that vanishes at badge size. The SVG is injected as markup, so build it in your adapter code and never from user input.

An adapter can also declare an `optionsSchema` describing the options worth offering in a UI, which is what lets the dashboard render a form for any adapter without knowing it. Fields carry a `default` (so a checkbox can tell "left alone" from "turned off"), keys may be dotted (`pairWithPhoneNumber.phoneNumber`) to reach a nested option, and a field may be:

- `uiOnly` — a choice that shapes the form without being an option, such as "QR or pairing code";
- conditional via `showWhen`, shown only while another field holds a given value. Hidden fields are never collected.
- `advanced` — tuning most people never touch, which a UI can fold away so the options that decide how a client connects stay in view.

Give `forRoot` a `storage` and virtual clients survive a restart:

```typescript
NestWhatsModule.forRoot({
  adapters: [new WhatsAppWebJsAdapterFactory({ authStrategy: new LocalAuth() })],
  clients: [new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, { name: "personal" })],
  storage: new JsonFileVirtualClientStorage(),
})
```

Without `storage` they exist only for the current process. `JsonFileVirtualClientStorage` writes to `.nestwhats/virtual-clients.json` by default; pass a path to change it. `VirtualClientStorageAdapter` is an interface, so Redis or a database work just as well:

```json
{
  "virtualClients": [
    { "name": "business", "prefix": ".", "adapter": "whatsapp-web.js" }
  ]
}
```

What is stored is the *configuration* (name, prefix, adapter class name, options), not credentials: those belong to the adapter's auth strategy, which for whatsapp-web.js means `.wwebjs_auth/session-<name>`. Deleting the storage file stops the client from being recreated; deleting the session makes it ask to authenticate again.

Destroying a client removes it from storage; shutting the app down does not — a restart brings it back.

### Ids are normalised at the adapter boundary

Platforms spell the same address differently — `5511999@c.us` in whatsapp-web.js, `5511999@s.whatsapp.net` in Baileys. Adapters convert to a neutral form on the way out and back on the way in, so an id an application stores keeps working when the platform underneath changes:

| Canonical | whatsapp-web.js |
|-----------|-----------------|
| `5511999@user` | `5511999@c.us` |
| `123-456@group` | `123-456@g.us` |
| `789@lid` | `789@lid` |

The `:device` suffix WhatsApp uses to address one linked device (`5511999:12@c.us`) is stripped, so the same person is always one id — otherwise a sender would not match the same contact listed as a group participant.

`parseJid`, `buildJid`, `bareId` and `isGroupJid` are exported for working with them. The untouched native id is always on `raw`.

## 🛡️ Guards

Built-in guards for command handlers: `DmOnlyGuard`, `GroupOnlyGuard`, `FromMeGuard`, `IsAdminGuard`.

## 📖 License

[GPL-3.0 License](https://github.com/NedcloarBR/NestWhats/blob/master/License)

## 🗞️ Credits

- This project is inspired in [Necord](https://necord.org/) - 🤖 A module for creating Discord bots using NestJS, based on Discord.js

- Want to see your name on this list? - see the [Contribution](https://github.com/NedcloarBR/NestWhats/blob/master/.github/CONTRIBUTING.md) page.
