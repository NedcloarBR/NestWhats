<h1 align="center">
  <br>
  <img width="35" src="https://github.com/NedcloarBR/NestWhats/blob/master/assets/logo.png?raw=true"> @nestwhats/dashboard
  <br>
</h1>

<h3 align="center">Web dashboard for monitoring <b><a href="https://www.npmjs.com/package/nestwhats">NestWhats</a></b> multi-client bots</h3>

<p align="center">
  <a href="https://github.com/NedcloarBR/NestWhats/blob/master/License">
    <img src="https://img.shields.io/github/license/NedcloarBR/NestWhats" alt="License">
  </a>
  <a href="https://www.npmjs.com/package/@nestwhats/dashboard">
    <img src="https://img.shields.io/npm/v/@nestwhats/dashboard" alt="npm version">
  </a>
</p>

## About

`@nestwhats/dashboard` provides a standalone HTTP server with a real-time web UI that shows the status of all registered WhatsApp clients — QR codes, connection status, phone number, and uptime.

> [!NOTE]
> Requires [`nestwhats`](https://www.npmjs.com/package/nestwhats) `^2.2.0` as a peer dependency.

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
import { Module } from '@nestjs/common';

@Module({
  imports: [
    NestWhatsModule.forRoot({ prefix: '!' }),
    NestWhatsDashboardModule.forRoot({
      port: 3001,
      path: '/dashboard',
    }),
  ],
})
export class AppModule {}
```

Open `http://localhost:3001/dashboard` to view the dashboard.

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `3001` | Port for the dashboard HTTP server |
| `path` | `string` | `'/'` | URL path where the dashboard is served |
| `auth.username` | `string` | — | Basic auth username (optional) |
| `auth.password` | `string` | — | Basic auth password (optional) |

### With basic auth

```typescript
NestWhatsDashboardModule.forRoot({
  port: 3001,
  auth: {
    username: 'admin',
    password: 'secret',
  },
})
```

### Async configuration

```typescript
NestWhatsDashboardModule.forRoot({
  port: process.env.DASHBOARD_PORT ? Number(process.env.DASHBOARD_PORT) : 3001,
  auth: {
    username: process.env.DASHBOARD_USER!,
    password: process.env.DASHBOARD_PASS!,
  },
})
```

## License

[GPL-3.0](https://github.com/NedcloarBR/NestWhats/blob/master/License)
