---
sidebar_position: 2
title: Connection lifecycle
description: Status, disconnect reasons, debouncing and reconnection.
---

# Connection lifecycle

An adapter reports state; the core decides what it means.

## Status

```typescript showLineNumbers
enum ClientStatus {
  Initializing,
  QrReceived,           // waiting for a scan
  PairingCodeReceived,  // waiting for a code on the phone
  Authenticated,        // credentials accepted, not usable yet
  Ready,                // connected and able to send
  Disconnected,
}
```

`ClientsRegistryService` always reflects reality immediately, debounce or not —
a dashboard should show a client as down the moment it drops.

## Disconnect reasons

`DisconnectReason` normalises across platforms so a handler can act without
knowing which is underneath. Reconnecting is pointless after a logout, and
prompting for a new QR is wrong after a flaky network.

| `DisconnectKind` | Meaning |
|---|---|
| `LoggedOut` | Credentials revoked; must authenticate again |
| `AuthFailure` | The platform rejected the credentials |
| `RestartRequired` | Expected restart; the platform reconnects itself |
| `Forbidden` | The account is refused — blocked, or ineligible |
| `ConnectionLost` | Transport dropped; usually transient |
| `Conflict` | Another session took over |
| `Unknown` | |

```typescript
@On('disconnected')
public onDrop(@Context() [, reason]: ContextOf<'disconnected'>) {
  if (isTerminalDisconnect(reason)) {
    this.alerts.send('needs a new QR code');
  }
}
```

The platform's own code and wording stay on `reason.code` and `reason.message`
for logs.

## Ignoring brief drops

Platforms that reconnect on their own drop and recover within seconds. Without
help, every flap gives handlers a `disconnected`/`ready` pair for something that
never really went away.

```typescript
NestWhatsModule.forRoot({ disconnectDebounceMs: 30_000 })
```

A reconnect inside the window cancels the announcement — and the recovery events
are swallowed too, because from a handler's point of view nothing happened. A
terminal reason always announces immediately, since no reconnect is coming.

## Reconnecting

Off by default: a platform that retries internally should keep owning it, and
turning this on would race its own attempts. whatsapp-web.js does *not* retry —
it simply stops — so it is the one that needs this.

```typescript
NestWhatsModule.forRoot({
  reconnect: {},   // 1s doubling to 60s, 5 min cooldown when refused, never after a logout
})
```

One timer at a time, and nothing fires for a client that came back while the
timer was pending.

## Shutdown

```typescript
app.enableShutdownHooks();
```

Without it, Ctrl+C leaves browsers and sockets behind. The whatsapp-web.js
adapter additionally disables puppeteer's own signal handlers, which would
otherwise call `process.exit()` before Nest could run its hooks.

## Health checks

```typescript title="src/health.controller.ts"
@Get('health')
@HealthCheck()
public check() {
  return this.health.check([() => this.whatsapp.isHealthy('whatsapp')]);
}
```

`NestWhatsHealthIndicator` reports every client's status through
[Terminus](https://docs.nestjs.com/recipes/terminus), Nest's health-check
package.
