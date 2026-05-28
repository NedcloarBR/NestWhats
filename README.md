<h1 align="center">
  <br>
  <img width="35" src="https://github.com/NedcloarBR/NestWhats/blob/master/assets/logo.png?raw=true"> NestWhats
  <br>
</h1>

<h3 align="center">A <b><a href="https://wwebjs.dev/">whatsapp-web.js</a></b> wrapper for <b><a href="https://nestjs.com">NestJS</a></b> to create <b><a href="https://www.whatsapp.com/">WhatsApp</a></b> bots</h3>

<p align="center">
  <a href="https://github.com/NedcloarBR/NestWhats/blob/master/License">
    <img src="https://img.shields.io/github/license/NedcloarBR/NestWhats" alt="License">
  </a>
  <a href="https://www.npmjs.com/package/nestwhats">
    <img src="https://img.shields.io/npm/v/nestwhats?label=nestwhats" alt="nestwhats version">
  </a>
  <a href="https://www.npmjs.com/package/@nestwhats/dashboard">
    <img src="https://img.shields.io/npm/v/@nestwhats/dashboard?label=%40nestwhats%2Fdashboard" alt="@nestwhats/dashboard version">
  </a>
  <a href="https://www.npmjs.com/package/@nestwhats/locale">
    <img src="https://img.shields.io/npm/v/@nestwhats/locale?label=%40nestwhats%2Flocale" alt="@nestwhats/locale version">
  </a>
</p>

---

This is the NestWhats monorepo. Each package is published independently — install only what you need.

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`nestwhats`](./packages/core) | [![npm](https://img.shields.io/npm/v/nestwhats)](https://www.npmjs.com/package/nestwhats) | Core module — whatsapp-web.js wrapper for NestJS |
| [`@nestwhats/dashboard`](./packages/dashboard) | [![npm](https://img.shields.io/npm/v/@nestwhats/dashboard)](https://www.npmjs.com/package/@nestwhats/dashboard) | Web dashboard for monitoring multi-client bots |
| [`@nestwhats/locale`](./packages/locale) | [![npm](https://img.shields.io/npm/v/@nestwhats/locale)](https://www.npmjs.com/package/@nestwhats/locale) | Internationalization (i18n) support for NestWhats bots |

## Development

**Requirements:** Node.js `v20+`, Yarn `v4`

```bash
# Install dependencies
yarn install

# Build all packages
yarn build

# Build a specific package
yarn build:core
yarn build:dashboard
```

## Release

Each package has its own release cycle and changelog.

```bash
yarn release:core
yarn release:dashboard
```

## License

[GPL-3.0](./License)
