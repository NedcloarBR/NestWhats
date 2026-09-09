---
sidebar_position: 2
title: Clients
description: Several numbers in one app, and clients created at runtime.
---

# Clients

A client is one connection: one WhatsApp account, with its own session and
prefix. An application can run as many as it likes.

```typescript
NestWhatsModule.forRoot({
  adapters: [WhatsAppWebJsAdapterFactory],
  clients: [
    new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, { name: 'personal', prefix: '!' }),
    new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, { name: 'business', prefix: '/' }),
  ],
})
```

The factory derives each client's credentials from its name, so the two never
share a session.

## Using a specific client

```typescript
@InjectClient('business') private readonly business: NestWhatsClient
```

Handlers can be restricted with `client` on the decorator, and
`NestWhatsMessagingService` takes `{ client: 'business' }` on every call.

## Virtual clients

A virtual client is created while the application is running, rather than
declared in code. The dashboard's "add client" button creates one, and so can
your own admin endpoint.

```typescript
await this.manager.createClient({
  name: 'support',
  adapter: WhatsAppWebJsAdapterFactory,
  options: { pairWithPhoneNumber: { phoneNumber: '5511999998888' } },
});
```

Naming the factory types the `options` the same way `NestWhatsClientConfig`
does.

:::info They are not injectable
A declared client gets a DI token because the module knows about it at boot. A
virtual one does not exist yet, so there is no token to create. Reach them
through `ClientsRegistryService` or `NestWhatsMessagingService`:

```typescript
const client = this.registry.getClient('support');
await this.messaging.sendMessage(chatId, 'hello', { client: 'support' });
```

This is why virtual clients suit messaging — sending from an account chosen at
runtime — while declared clients suit bots, whose handlers are written in
advance.
:::

## Keeping clients across restarts

Pass `storage` and virtual clients come back on the next boot:

```typescript
NestWhatsModule.forRoot({
  adapters: [WhatsAppWebJsAdapterFactory],
  storage: new JsonFileVirtualClientStorage(),   // .nestwhats/virtual-clients.json
})
```

What is stored is the configuration needed to recreate the client, not its
credentials — those belong to the adapter's auth strategy. Losing the file means
the client is not recreated; losing the credentials means it is recreated and
asks to authenticate again.

Implement `VirtualClientStorageAdapter` to keep them somewhere else — a
database, or a shared store when several instances must agree on which clients
exist. Clients declared in code are never written there; they come from the
module every boot.

## Changing a client

```typescript
await this.manager.updateClient('support', { prefix: '.' });
```

A prefix change applies in place. An options change cannot: they were baked in
when the factory built the adapter, so the client is torn down and started
again, which drops its connection for a moment. Credentials live under the same
client name, so it comes back authenticated rather than asking for a new QR
code.

## Removing a client

```typescript
await this.manager.destroyClient('support');
```

Only virtual clients can be destroyed — a declared one is managed by the
application lifecycle. Shutting the app down is not deletion: virtual clients
are torn down without touching storage, so they return on the next boot.
