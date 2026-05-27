# Changelog
All notable changes to this project will be documented in this file.

# [2.3.1](https://github.com/NedcloarBR/NestWhats/compare/dashboard-v1.2.0...v2.3.1) - (2026-05-27)

## Bug Fixes

- **core:** Change AUTHENTICATED and READY listeners from once to on ([e4faf31](https://github.com/NedcloarBR/NestWhats/commit/e4faf316ff935648b73a6cf9d291f6bd521f0b11))

## Refactor

- **core:** Centralize option defaults and split command responsibilities ([6a1e28e](https://github.com/NedcloarBR/NestWhats/commit/6a1e28e06325249cdf2d97901c70ac0c9491ea44))

# [2.3.0](https://github.com/NedcloarBR/NestWhats/compare/dashboard-v1.0.0...v2.3.0) - (2026-05-26)

## Bug Fixes

- **core:** Handle AUTHENTICATION_FAILURE to prevent unhandled rejection ([6867aa0](https://github.com/NedcloarBR/NestWhats/commit/6867aa09a257819199cca439aa8323880b8a0fc1))

## Documentation

- Add workspace and dashboard READMEs, update license year and package files ([4e15c88](https://github.com/NedcloarBR/NestWhats/commit/4e15c88fde4f6de22fbc242182816a4c240ce0d2))

## Features

- **core:** Add observer pattern to ClientsRegistryService ([7026b13](https://github.com/NedcloarBR/NestWhats/commit/7026b13e0aaf84139e4788471345b4309cb81c40))

# [2.2.0](https://github.com/NedcloarBR/NestWhats/compare/v2.1.1...v2.2.0) - (2026-05-24)

## Bug Fixes

- **release:** Remove biome files.include restriction that blocked package.json formatting in release hook ([1e65500](https://github.com/NedcloarBR/NestWhats/commit/1e65500185a86056e6ab66412184eb7d179342b7))

## Features

- Extract packages with Nx project configs and per-package release ([aa3baa6](https://github.com/NedcloarBR/NestWhats/commit/aa3baa6f1ee80f23343569042dec3115d587c68c))

# [2.1.1](https://github.com/NedcloarBR/NestWhats/compare/v2.1.0...v2.1.1) - (2026-05-24)

## Bug Fixes

- Commit history and bump version to v2.1.0 ([2f9c717](https://github.com/NedcloarBR/NestWhats/commit/2f9c7174320df92fee263b9b26f073f52c73a762))

## Features

- Implement graceful shutdown for clients and dashboard server ([414e4d7](https://github.com/NedcloarBR/NestWhats/commit/414e4d78541fc15eec3f1e76a40454395c482266))
- Implement graceful shutdown for clients and dashboard server ([fe408a7](https://github.com/NedcloarBR/NestWhats/commit/fe408a78efd2cf233a120cd113a8c083a6610aff))

# [2.0.4](https://github.com/NedcloarBR/NestWhats/compare/v2.0.0...v2.0.4) - (2026-05-23)

## Bug Fixes

- **release:** Reformat package.json after version bump ([de3b487](https://github.com/NedcloarBR/NestWhats/commit/de3b4874a0802bbf1fe61c80e8f38bead4a9eeae))
- **pipes:** Lazy-load optional peer deps in ParseArgsPipe ([ea97f37](https://github.com/NedcloarBR/NestWhats/commit/ea97f37de148041b2e3d1ec0a9baea42805a0494))
- **module:** Export Client token for default client backward compat ([9f57b48](https://github.com/NedcloarBR/NestWhats/commit/9f57b48fc4c1622aec20c953c27579169b959e13))

## Features

- **commands:** Add per-client command filtering ([f38a2d3](https://github.com/NedcloarBR/NestWhats/commit/f38a2d35770ac115fec44df5867dda2f0f9ec72b))

# [2.0.0](https://github.com/NedcloarBR/NestWhats/compare/v1.1.0...v2.0.0) - (2026-05-23)

## Bug Fixes

- **explorer:** Defer provider discovery to explore() call time ([0ec1475](https://github.com/NedcloarBR/NestWhats/commit/0ec14756545142fe8dd2dd66ffe0a4309c6f1808))

## Features

- Add multi-client support with per-client event filtering ([eaffee2](https://github.com/NedcloarBR/NestWhats/commit/eaffee27a8c987c29caf3c5bf06298734d3d445e))
- **commands:** Add per-command prefix support ([45fc91d](https://github.com/NedcloarBR/NestWhats/commit/45fc91db890f318398040084d9e3d63b6705f266))

# [1.1.0](https://github.com/NedcloarBR/NestWhats/compare/v1.0.3...v1.1.0) - (2026-05-23)

## Features

- **guards:** Add GroupOnly, DmOnly, IsAdmin and FromMe built-in guards ([8f2e0b8](https://github.com/NedcloarBR/NestWhats/commit/8f2e0b8718e96514aa2e00ef8057c8570d8f3ea2))
- **commands:** Add typed argument parser with class-validator support ([671f3c2](https://github.com/NedcloarBR/NestWhats/commit/671f3c23556283cf84a340ec46998d39d1c7b30f))
- **commands:** Add param decorators `@Message`(`@Msg`), `@Chat`, `@Author` and index support to `@Args` ([93fb855](https://github.com/NedcloarBR/NestWhats/commit/93fb8558126f9e7b13a61c208613567bd25a1232))
- **commands:** Add aliases support to `@Command` decorator ([68092f9](https://github.com/NedcloarBR/NestWhats/commit/68092f9a44b293a92448836a16eb7e672daa0821))
- Add NestWhatsGuard and NestWhatsExceptionFilter interfaces ([80adc9e](https://github.com/NedcloarBR/NestWhats/commit/80adc9ef6bed77c0afd5716bc0ddc381d5345d31))

# [v1.0.3](https://github.com/NedcloarBR/NestWhats/compare/v1.0.2...v1.0.3) - (2025-02-01)

## Bug Fixes

- Build script ([8193216](https://github.com/NedcloarBR/NestWhats/commit/8193216d55b50280de54b36e05fa17e86b7c86d9))

# [v1.0.2](https://github.com/NedcloarBR/NestWhats/compare/v1.0.1...v1.0.2) - (2025-02-01)

## Bug Fixes

- Move husky from postinstall to prepare

# [v1.0.1](https://github.com/NedcloarBR/NestWhats/commits/v1.0.0...v1.0.1) - (2025-02-01)

## Bug Fixes

- Node engine ([56e41d4](https://github.com/NedcloarBR/NestWhats/commit/56e41d42cce4507a40f8373d67890b3ab6155535))

# [v1.0.0](https://github.com/NedcloarBR/NestWhats/commits/v1.0.0) - (2025-02-01)

## Features

- Add cliff for changelogs ([696ce5e](https://github.com/NedcloarBR/NestWhats/commit/696ce5ec41b9f16f54d7d36f85b5a1e7093bcc2c))
- Handle qrcode generation error ([26d5111](https://github.com/NedcloarBR/NestWhats/commit/26d5111020b728028c8917a734d1ecbbf5413a6a))
- Improve exports and add module test ([30acc6f](https://github.com/NedcloarBR/NestWhats/commit/30acc6ff8a6e1a49e9787c4c851586c3eef7f4de))
- Add listeners and commands module ([5b296a1](https://github.com/NedcloarBR/NestWhats/commit/5b296a1a1b58353d307af906512688e01c0b381c))
- Inital commit ([3432a38](https://github.com/NedcloarBR/NestWhats/commit/3432a38576ee27e0a2d90952459f436c1ae03a34))

## Styling

- Update biome and lint/format ([9985673](https://github.com/NedcloarBR/NestWhats/commit/9985673e19da6397bd7432df8824c2e70be77415))

