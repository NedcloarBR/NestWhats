---
sidebar_position: 2
title: Installation
description: The packages you need, and what they require.
---

# Installation

NestWhats needs the core plus one platform package. The core alone cannot
connect to anything.

```bash npm2yarn
npm install nestwhats @nestwhats/platform-whatsapp-web.js
```

Every package is a peer of [NestJS](https://docs.nestjs.com) 12 and expects
`reflect-metadata` and `rxjs`, which a Nest application already has.

## Requirements

| | Version |
|---|---|
| Node.js | **≥ 20.19.0** |
| NestJS | **12** |
| TypeScript | **≥ 5.9**, 6.x recommended |

## Optional packages

Each is independent, and each page has its own setup.

| Package | What it does |
|---|---|
| [Dashboard](./packages/dashboard.md) | A web UI for connections, QR codes and clients created at runtime |
| [Webhook](./packages/webhook.md) | Listeners you can bind and unbind at runtime, per client |
| [Locale](./packages/locale.md) | Replies in the language of whoever is writing |

## Choosing a platform

The core cannot connect on its own. See
[Choosing a platform](./platforms/overview.md) for what each one can do, and
[whatsapp-web.js](./platforms/whatsapp-web-js.md) for the one that ships today.
