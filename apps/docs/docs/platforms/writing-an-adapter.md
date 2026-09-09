---
sidebar_position: 4
title: Writing an adapter
description: The contract a platform package implements.
---

# Writing an adapter

A platform package ships two classes: the **adapter**, which is one client's
connection, and a **factory**, which holds shared configuration and builds one
adapter per client.

## The adapter emits two events

That is the whole mandatory event contract:

```typescript showLineNumbers
interface NestWhatsAdapterEvents {
  connectionUpdate: [update: ConnectionUpdate];
  messageUpsert: [message: NestWhatsMessage];
}

interface ConnectionUpdate {
  status: ClientStatus;
  qr?: string;               // platforms that authenticate by QR
  pairingCode?: string;      // platforms that pair by phone code
  reason?: DisconnectReason; // why it closed
}
```

The core derives `qr`, `pairingCode`, `authenticated`, `ready` and
`disconnected` from `connectionUpdate`, and tracks transitions itself — never
emit those five, and never try to remember which you already sent.

Every field but `status` is optional, so a platform reports what it actually
has: whatsapp-web.js sends a QR, and Baileys can send a QR *or* a pairing code.
A platform with no session at all would send neither and simply start out
`Ready` — the contract allows that, which is what keeps a webhook-based adapter
possible.

## The mandatory methods

`initialize`, `destroy`, `on`/`once`/`off`, `getInfo`, `sendMessage`, and `raw`.
Everything else is optional, and **implementing it is the declaration** —
`supportsCapability` reads the method, so there is no second list to keep in
sync.

```typescript
export class MyAdapter extends EventEmitter implements NestWhatsAdapter<MyClient> {
  public async sendMessage(chatId: string, content: string) { /* … */ }

  // optional — implementing it is what announces AdapterCapability.Presence
  public async sendPresence(chatId: string, state: PresenceState) { /* … */ }
}
```

## The factory

```typescript title="src/factory.ts" showLineNumbers
export class MyAdapterFactory implements NestWhatsAdapterFactory<MyAdapter, MyOptions> {
  public readonly id = 'my-platform';
  public readonly platform = MY_PLATFORM;            // badge for a UI
  public readonly optionsSchema = MY_OPTIONS_SCHEMA; // form fields for a UI

  public constructor(private readonly config: MyOptions = {}) {}

  public create(clientName: string, options?: MyOptions): MyAdapter {
    return new MyAdapter({ ...this.config, ...options }, clientName);
  }
}
```

Three things follow from the split:

- **Nothing identifying is ever shared.** Credentials and session directories
  are derived inside `create`, from `clientName` or that client's own options.
- **A platform can demand something per client and say so at boot.** Throw in
  `create` rather than quietly starting two clients on one account.
- **`platform` and `optionsSchema` describe the platform, not a connection,** so
  a dashboard renders the badge and form before any client exists.

`id` is what a client names and what gets written to storage for a virtual
client, so it must survive a restart and a minifier.

## Normalise ids at the boundary

Convert to the canonical spelling (`@user`, `@group`, `@lid`) coming in, and
back to the platform's own going out. Then ids stay stable when someone swaps
the platform underneath.

## Extend the vocabulary, do not widen the core

If your platform has a feature the core has no name for, register a capability
from your own package rather than hiding it behind `raw`:

```typescript
declare module 'nestwhats' {
  interface AdapterCapabilities {
    template: 'sendTemplate';
  }
}

registerCapability('template', 'sendTemplate');
```

The same goes for events, through `NestWhatsBaseEvents`.

## Ship ESM only

One build, `"type": "module"`, no `require` condition. A dual package is
evaluated twice in one process, which gives every class two identities and
breaks Nest's injector.

Two rules follow from that:

- **No top-level await.** `require()` refuses an asynchronous module, so one
  `await` at the top of one published file breaks every CommonJS consumer.
- **Anything a consumer might hold across a package boundary** — an injection
  token, a metadata key — goes through `Symbol.for`, never a plain `Symbol()`.
