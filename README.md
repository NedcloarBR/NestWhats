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
    <img src="https://img.shields.io/npm/v/nestwhats?label=nestwhats" alt="nestwhats version">
  </a>
  <a href="https://www.npmjs.com/package/@nestwhats/platform-whatsapp-web.js">
    <img src="https://img.shields.io/npm/v/@nestwhats/platform-whatsapp-web.js?label=%40nestwhats%2Fplatform-whatsapp-web.js" alt="@nestwhats/platform-whatsapp-web.js version">
  </a>
  <a href="https://www.npmjs.com/package/@nestwhats/platform-baileys">
    <img src="https://img.shields.io/npm/v/@nestwhats/platform-baileys?label=%40nestwhats%2Fplatform-baileys" alt="@nestwhats/platform-baileys version">
  </a>
  <a href="https://www.npmjs.com/package/@nestwhats/dashboard">
    <img src="https://img.shields.io/npm/v/@nestwhats/dashboard?label=%40nestwhats%2Fdashboard" alt="@nestwhats/dashboard version">
  </a>
  <a href="https://www.npmjs.com/package/@nestwhats/webhook">
    <img src="https://img.shields.io/npm/v/@nestwhats/webhook?label=%40nestwhats%2Fwebhook" alt="@nestwhats/webhook version">
  </a>
  <a href="https://www.npmjs.com/package/@nestwhats/locale">
    <img src="https://img.shields.io/npm/v/@nestwhats/locale?label=%40nestwhats%2Flocale" alt="@nestwhats/locale version">
  </a>
</p>

<p align="center">
  <b><a href="https://nedcloarbr.github.io/nestwhats">Documentation</a></b>
  •
  <a href="https://nedcloarbr.github.io/nestwhats/docs/getting-started">Getting started</a>
  •
  <a href="./examples">Examples</a>
  •
  <a href="https://nedcloarbr.github.io/nestwhats/docs/platforms/overview">Choosing a platform</a>
</p>

---

This is the NestWhats monorepo. Each package is published independently — install only what you need.

## Packages

| Package | Version | Description | Docs |
|---------|---------|-------------|------|
| [`nestwhats`](./packages/core) | [![npm](https://img.shields.io/npm/v/nestwhats)](https://www.npmjs.com/package/nestwhats) | Core — adapter-agnostic framework: commands, guards, listeners, client lifecycle | [Guide](https://nedcloarbr.github.io/nestwhats/docs/intro) |
| [`@nestwhats/platform-whatsapp-web.js`](./packages/platform-wwjs) | [![npm](https://img.shields.io/npm/v/@nestwhats/platform-whatsapp-web.js)](https://www.npmjs.com/package/@nestwhats/platform-whatsapp-web.js) | whatsapp-web.js adapter — real WhatsApp Web in a headless browser | [Guide](https://nedcloarbr.github.io/nestwhats/docs/platforms/whatsapp-web-js) |
| [`@nestwhats/platform-baileys`](./packages/platform-baileys) | [![npm](https://img.shields.io/npm/v/@nestwhats/platform-baileys)](https://www.npmjs.com/package/@nestwhats/platform-baileys) | Baileys adapter — WebSocket, no browser; QR or pairing code | [Guide](https://nedcloarbr.github.io/nestwhats/docs/platforms/baileys) |
| [`@nestwhats/dashboard`](./packages/dashboard) | [![npm](https://img.shields.io/npm/v/@nestwhats/dashboard)](https://www.npmjs.com/package/@nestwhats/dashboard) | Live web UI: client status, QR codes, and virtual client management | [Guide](https://nedcloarbr.github.io/nestwhats/docs/packages/dashboard) |
| [`@nestwhats/webhook`](./packages/webhook) | [![npm](https://img.shields.io/npm/v/@nestwhats/webhook)](https://www.npmjs.com/package/@nestwhats/webhook) | Outbound dispatch — bind `@Webhook()` listeners per client at runtime | [Guide](https://nedcloarbr.github.io/nestwhats/docs/packages/webhook) |
| [`@nestwhats/locale`](./packages/locale) | [![npm](https://img.shields.io/npm/v/@nestwhats/locale)](https://www.npmjs.com/package/@nestwhats/locale) | Internationalization (i18n) support for NestWhats | [Guide](https://nedcloarbr.github.io/nestwhats/docs/packages/locale) |
| `@nestwhats/metrics` | _planned_ | Prometheus/OpenTelemetry metrics — messages, commands, client status; replaces the health indicator in core | — |

## Examples

[`examples/`](./examples) holds ten standalone applications, one per thing the
framework does — a `!ping` bot, guards and pipes, several numbers at once, the
dashboard, webhooks, localization, and what Baileys reaches that a browser
session cannot. They are outside the workspace, so install inside the one you
want.

## Architecture

The core knows nothing about any WhatsApp library. It defines the structures (`NestWhatsMessage`, `NestWhatsChat`, `NestWhatsContact`), the client lifecycle, and an adapter contract of exactly two events — `connectionUpdate` and `messageUpsert`. A platform package implements that contract against a real library, the way NestJS itself works with Express and Fastify adapters.

```
your bot          @On / @Command / guards / @InjectClient
   │
nestwhats         structures · client lifecycle · virtual clients · persistence
   │              ── adapter contract ──
platform-*        whatsapp-web.js and Baileys
```

Two consequences worth knowing: ids are normalised at the adapter boundary (`5511999@c.us` becomes `5511999@user`), so what you store keeps working across platforms; and everything a platform offers beyond the contract stays reachable, fully typed, through `raw`.

Platforms are not equally capable — a browser session reads whole chats, the Cloud API only answers about messages it delivered — so the mandatory contract is only what all of them can honour, and everything else is an optional method. Implementing it is what announces the matching capability, so there is no second list to keep in sync.

## Module format

Every package is published as **ESM only** — one build, one `"type": "module"`,
no `require` condition. NestJS itself went ESM-only in v12, and a CommonJS
application still consumes these packages normally through Node's `require(esm)`,
available unflagged since Node 20.19.

Shipping a dual CJS+ESM build would be the harmful option, not the compatible
one. Node evaluates the two builds independently, so every class in the package
would exist twice in one process, with the same name and different identity —
and Nest's injector matches providers by reference. Publishing one format is
what guarantees a single copy:

```
ESM-only package  → import === require ?  true
dual package      → import === require ?  false
```

Two rules follow from that:

- **No top-level await** anywhere in published code. `require()` refuses an
  asynchronous module, and one `await` at the top of one file takes every
  CommonJS consumer down.
- **Injection tokens are resolved by key**, through `Symbol.for`, never by a
  plain `Symbol()` or a class reference. Registry symbols keep working even if a
  consumer somehow ends up with two copies of a package.

## Development

**Requirements:** Node.js `v20.19+`, Yarn `v4`

```bash
# Install dependencies
yarn install

# Build everything
yarn build
```

```bash
# Typecheck, test, and lint the way CI does
yarn typecheck
yarn test
yarn lint
```

Tests run on [Vitest](https://vitest.dev), which executes the packages' own
ESM and TypeScript with no transform step. `yarn test:watch` re-runs on save
and `yarn test:coverage` reports what is covered.

```bash
# Build a single package
yarn build:core
yarn build:platform-wwjs
yarn build:platform-baileys
yarn build:dashboard
yarn build:locale
yarn build:webhook
```

### Documentation site

The site under `apps/docs` is a Docusaurus app, published to
[nedcloarbr.github.io/nestwhats](https://nedcloarbr.github.io/nestwhats) on
every push to `master`.

```bash
# Dev server with hot reload
yarn docs:start

# Production build, including the generated API reference
yarn docs:build
```

The API reference is generated from the packages' TSDoc on every build and is
not committed — change the comments in the package, not the generated pages.
See `apps/docs/README.md`.

## Release

Each package has its own release cycle and changelog.

```bash
yarn release:core
yarn release:platform-wwjs
yarn release:platform-baileys
yarn release:dashboard
yarn release:locale
yarn release:webhook
```

## License

[GPL-3.0](./License)
