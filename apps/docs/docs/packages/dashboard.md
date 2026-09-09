---
sidebar_position: 1
title: Dashboard
description: A web UI for connections, QR codes and clients created at runtime.
---

# Dashboard

```bash npm2yarn
npm install @nestwhats/dashboard
```

```typescript
NestWhatsDashboardModule.forRoot({
  port: 4000,
  path: 'dashboard',
})
```

Open `http://localhost:4000/dashboard`.

It runs its own HTTP server, so it works in an application that has no web
server at all — a bot started with `createApplicationContext` is enough.

## Options

| Option | Type | Default | What it does |
|---|---|---|---|
| `port` | `number` | `4000` | Port for the dashboard server |
| `path` | `string` | `'nestwhats'` | URL path it is served at |
| `auth.username` | `string` | — | Basic auth, if you want it |
| `auth.password` | `string` | — | |
| `webhook` | `boolean` | `false` | Show the bind/unbind controls from `@nestwhats/webhook` |

:::caution
There is no authentication by default, and the dashboard can create and destroy
clients. Set `auth` on anything reachable beyond localhost.
:::

## What it shows

Each client is a card with its platform badge, connection status, phone number
and prefix, updating live — the registry pushes changes rather than the page
polling.

- **QR code or pairing code**, whichever the platform uses, rendered inline
- **Capabilities**, collapsed, showing what the adapter can and cannot do
- **Prefix**, editable, applied on the next message with no reconnect
- **Webhook bindings**, when the webhook package is installed

The platform badge comes from the factory, not the connection, so it is right
from the first render — long before the client is up.

## Creating clients

The create form builds its fields from the adapter itself: each factory declares
an `optionsSchema`, and the dashboard renders a labelled input per option — text,
number, checkbox, dropdown or radio. Options marked `advanced` fold into **More
settings**, leaving only what decides how a client connects on screen. An
"Advanced (JSON)" box covers whatever the schema does not.

With more than one factory registered a picker appears and the fields follow the
selection.

Clients created here are [virtual clients](../core/clients.md#virtual-clients).
Configure `storage` on `NestWhatsModule.forRoot` to have them survive a restart.

## Editing

**Prefix** applies immediately. **Options** cannot: they were baked in when the
adapter was built, so the client is torn down and started again — the connection
drops for a moment, then comes back authenticated, because the credentials live
under the same client name.
