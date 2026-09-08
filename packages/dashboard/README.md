<h1 align="center">
  <br>
  <img width="35" src="https://github.com/NedcloarBR/NestWhats/blob/master/assets/logo.png?raw=true"> @nestwhats/dashboard
  <br>
</h1>

<h3 align="center">Web dashboard for monitoring <b><a href="https://www.npmjs.com/package/nestwhats">NestWhats</a></b> multi-client applications</h3>

<p align="center">
  <a href="https://github.com/NedcloarBR/NestWhats/blob/master/License">
    <img src="https://img.shields.io/github/license/NedcloarBR/NestWhats" alt="License">
  </a>
  <a href="https://www.npmjs.com/package/@nestwhats/dashboard">
    <img src="https://img.shields.io/npm/v/%40nestwhats%2Fdashboard" alt="npm version">
  </a>
  <a href="https://nedcloarbr.github.io/nestwhats/docs/packages/dashboard">
    <img src="https://img.shields.io/badge/docs-nestwhats-c11e43" alt="Documentation">
  </a>
</p>

<p align="center">
  <b><a href="https://nedcloarbr.github.io/nestwhats/docs/packages/dashboard">Read the documentation</a></b>
</p>

## About

`@nestwhats/dashboard` provides a standalone HTTP server with a real-time web UI (server-sent events) showing every registered client — which platform backs it, QR code or pairing code, connection status, phone number and uptime — plus per-client actions: logout, restart, force a new QR, and create or destroy virtual clients.

When a platform pairs by passkey — Baileys, for accounts WhatsApp has moved onto it — the card shows a **Use passkey** button in place of the pairing code and signs the challenge with the browser's own authenticator, or cancels the attempt. The dashboard learns this from the adapter announcing the `passkeyChallenge` event, not from any platform package, so another adapter that emits the same event gets the same panel. Signing only works when the passkey WhatsApp asks for is on the device opening the dashboard, and registered for the relying party WhatsApp names in the challenge (`web.whatsapp.com`).

> [!NOTE]
> Requires [`nestwhats`](https://www.npmjs.com/package/nestwhats) `^4.0.0` as a peer dependency.

## Installation

```bash
npm i nestwhats @nestwhats/dashboard
yarn add nestwhats @nestwhats/dashboard
pnpm add nestwhats @nestwhats/dashboard
```

## Usage

Import `NestWhatsDashboardModule` alongside your `NestWhatsModule`:

```typescript
import { NestWhatsModule } from 'nestwhats';
import { NestWhatsDashboardModule } from '@nestwhats/dashboard';
import { WhatsAppWebJsAdapterFactory } from '@nestwhats/platform-whatsapp-web.js';
import { LocalAuth } from 'whatsapp-web.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    NestWhatsModule.forRoot({
      adapter: new WhatsAppWebJsAdapterFactory({ authStrategy: new LocalAuth() }),
    }),
    NestWhatsDashboardModule.forRoot({
      port: 4000,
      path: 'dashboard',
    }),
  ],
})
export class AppModule {}
```

Open `http://localhost:4000/dashboard` to view the dashboard.

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `4000` | Port for the dashboard HTTP server |
| `path` | `string` | `'nestwhats'` | URL path where the dashboard is served |
| `auth.username` | `string` | — | Basic auth username (optional) |
| `auth.password` | `string` | — | Basic auth password (optional) |
| `webhook` | `boolean` | `false` | Show the bind/unbind controls from [`@nestwhats/webhook`](https://www.npmjs.com/package/@nestwhats/webhook) |

### Virtual clients

The dashboard creates and destroys virtual clients through the core's `NestWhatsClientManagerService`, so no extra package is needed.

The create form builds its fields from the adapter itself: each adapter declares an `optionsSchema`, and the dashboard renders a labelled input per option — text, number, checkbox, dropdown or radio — so nobody has to hand-write JSON. Options the adapter marks `advanced` fold into **More settings**, leaving only the ones that decide how a client connects on screen. An "Advanced (JSON)" box is still there for options the schema does not cover, merged over the fields. When more than one adapter is registered in `forRoot`, a picker appears and the fields follow the selection; with a single one the core resolves it.

Existing virtual clients have an **Edit** button, and the two halves behave differently on purpose:

- **Prefix** applies immediately, on the next message, with no reconnect.
- **Options** were baked into the adapter when it was built, so saving them tears the client down and recreates it. The form says so and asks for confirmation. Credentials live under the same client name, so it comes back authenticated instead of asking for a new QR.

Clients declared in `forRoot` cannot be edited from the UI — they are configured in code. Give `NestWhatsModule.forRoot` a `storage` and the ones created here survive a restart; without it they last for the process. Clients declared in `forRoot` cannot be destroyed from the UI.

### Webhook controls

With `webhook: true` and `NestWhatsWebhookModule` imported, each client card also lists the `@Webhook()` handlers and lets you bind or unbind them per client. If the module is missing, the controls are hidden and a warning is logged.

### With basic auth

```typescript
NestWhatsDashboardModule.forRoot({
  port: 4000,
  auth: {
    username: 'admin',
    password: 'secret',
  },
})
```

### Async configuration

```typescript
NestWhatsDashboardModule.forRoot({
  port: process.env.DASHBOARD_PORT ? Number(process.env.DASHBOARD_PORT) : 4000,
  auth: {
    username: process.env.DASHBOARD_USER!,
    password: process.env.DASHBOARD_PASS!,
  },
})
```

## License

[GPL-3.0](https://github.com/NedcloarBR/NestWhats/blob/master/License)
