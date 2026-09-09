<h1 align="center">
  <br>
  <img width="35" src="https://github.com/NedcloarBR/NestWhats/blob/master/assets/logo.png?raw=true"> @nestwhats/locale
  <br>
</h1>

<h3 align="center">Locale resolution for <b><a href="https://www.npmjs.com/package/nestwhats">NestWhats</a></b> — detect language from WhatsApp messages and inject translations into command and listener handlers</h3>

<p align="center">
  <a href="https://github.com/NedcloarBR/NestWhats/blob/master/License">
    <img src="https://img.shields.io/github/license/NedcloarBR/NestWhats" alt="License">
  </a>
  <a href="https://www.npmjs.com/package/@nestwhats/locale">
    <img src="https://img.shields.io/npm/v/%40nestwhats%2Flocale" alt="npm version">
  </a>
  <a href="https://nedcloarbr.github.io/NestWhats/docs/packages/locale">
    <img src="https://img.shields.io/badge/docs-nestwhats-c11e43" alt="Documentation">
  </a>
</p>

<p align="center">
  <b><a href="https://nedcloarbr.github.io/NestWhats/docs/packages/locale">Read the documentation</a></b>
</p>

## ❓ About

`@nestwhats/locale` adds i18n support to NestWhats. It resolves the locale from each incoming WhatsApp message, loads translations from any source, and injects a typed translation function directly into your command and listener handlers via a NestJS `APP_INTERCEPTOR` and `AsyncLocalStorage` — no prop-drilling required.

> [!IMPORTANT]
> Requires `nestwhats ^4.0.0`

## ⬇️ Installation

> [!NOTE]
> NodeJS `v20.19+` is required

```bash
$ npm i @nestwhats/locale
$ yarn add @nestwhats/locale
$ pnpm add @nestwhats/locale
```

## ⚙️ Setup

Import `NestWhatsLocaleModule` and call `forRoot` with an adapter and one or more resolvers. The fallback locale belongs to the adapter, which is what reads it:

```typescript
import { Module } from "@nestjs/common";
import {
  NestWhatsLocaleModule,
  DefaultLocaleAdapter,
  PhoneCountryResolver,
} from "@nestwhats/locale";

@Module({
  imports: [
    NestWhatsLocaleModule.forRoot({
      adapter: new DefaultLocaleAdapter({
        fallbackLocale: "en-US",
        locales: {
          "pt-BR": { "ping.response": "Pong!" },
          "en-US": { "ping.response": "Pong!" },
        },
      }),
      resolvers: new PhoneCountryResolver(),
    }),
  ],
})
export class AppModule {}
```

## 🔌 Adapters

Adapters hold your translations and resolve a key + locale to a translated string. Placeholders use `{{ name }}` syntax.

### `DefaultLocaleAdapter`

Flat key-value translations:

```typescript
new DefaultLocaleAdapter({
  fallbackLocale: "en-US",
  locales: {
    "pt-BR": { "ping.response": "Pong! Olá, {{ name }}!" },
    "en-US": { "ping.response": "Pong! Hello, {{ name }}!" },
  },
})
```

### `NestedLocaleAdapter`

Dot-notation keys resolved against a nested object:

```typescript
new NestedLocaleAdapter({
  fallbackLocale: "en-US",
  locales: {
    "pt-BR": { ping: { response: "Pong! Olá, {{ name }}!" } },
    "en-US": { ping: { response: "Pong! Hello, {{ name }}!" } },
  },
})
```

Key `"ping.response"` resolves to `"Pong! Hello, {{ name }}!"`.

### Custom adapter

Extend `BaseLocaleAdapter` to implement your own translation logic:

```typescript
import { BaseLocaleAdapter } from "@nestwhats/locale";

export class MyAdapter extends BaseLocaleAdapter {
  public getTranslation(key: string, locale: string): string {
    // your logic
    return key;
  }
}
```

## 📂 Loaders

Instead of defining translations inline, load them from the filesystem or any external source.

### `JSONLocaleLoader`

Reads JSON files from a directory. Supports two structures:

**Flat** — one JSON file per locale (use with `DefaultLocaleAdapter`):

```
locales/
  pt-BR.json
  en-US.json
```

**Nested** — locale → namespace → file (use with `NestedLocaleAdapter`):

```
locales/
  pt-BR/
    commands/
      ping.json
  en-US/
    commands/
      ping.json
```

Pass the loader directly as the `locales` option — `load()` is called automatically during module init:

```typescript
import { join } from "node:path";
import { JSONLocaleLoader, NestedLocaleAdapter } from "@nestwhats/locale";

new NestedLocaleAdapter({
  locales: new JSONLocaleLoader({ basePath: join(__dirname, "../locales") }),
  fallbackLocale: "en-US",
})
```

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `basePath` | `string` | — | Path to the locales directory |
| `ignore` | `string[]` | `[".git", ".gitkeep", "crowdin.yml", "README.md"]` | Files/folders to skip |

### Custom loader

Extend `BaseLocaleLoader` to load from any source (database, remote API, etc.):

```typescript
import { BaseLocaleLoader } from "@nestwhats/locale";

export class DatabaseLocaleLoader extends BaseLocaleLoader {
  public async load(): Promise<Record<string, Record<string, unknown>>> {
    // fetch from your database
    return { "en-US": { hello: "Hello!" } };
  }
}
```

## 🌐 Resolvers

Resolvers determine the locale for each message. They receive a `NestWhatsExecutionContext` and return a locale string or `undefined` to fall through to the next resolver.

### `PhoneCountryResolver`

Detects the locale from the sender's phone number DDI. Reads the number straight off a `@user` id, and for a `@lid` (WhatsApp's privacy-preserving address) resolves the contact through `message.getContact()`. Group, broadcast and newsletter ids have no number behind them and fall back to the default locale. Supports 80+ countries across Americas, Europe, Africa, and Asia-Pacific.

```typescript
resolvers: new PhoneCountryResolver()
```

### Multiple resolvers

Pass an array — the first non-`undefined` result wins:

```typescript
resolvers: [new PhoneCountryResolver(), new MyDatabaseResolver()]
```

### Custom resolver

Implement `LocaleResolver`:

```typescript
import type { LocaleResolver, LocaleResolverHints } from "@nestwhats/locale";
import { NestWhatsExecutionContext } from "nestwhats";

export class MyResolver implements LocaleResolver {
  async resolve(
    context: NestWhatsExecutionContext,
    hints?: LocaleResolverHints,
  ): Promise<string | undefined> {
    // [client, message]
    const [, message] = context.getContext<"message">();

    // A locale string, or undefined to fall through to the next resolver.
    return "pt-BR";
  }
}
```

`hints` carries what the interceptor already worked out for this message —
`hints.ddi` is the sender's country calling code. Resolving that costs a
contact lookup for a LID, so a resolver that only needs the code should read
it from here rather than pay for it again.

Class-based resolvers are also supported — pass the constructor and it is resolved via NestJS `ModuleRef`:

```typescript
resolvers: [MyResolver]
```

## 🔤 Using Translations

Inject the translation function with `@CurrentTranslate()` in any command or
listener handler. The message type comes from `nestwhats`, not from a platform
package, so the same handler works on every adapter:

```typescript
import { Injectable } from "@nestjs/common";
import { Command, Msg, type NestWhatsMessage } from "nestwhats";
import { CurrentTranslate, type TranslationFn } from "@nestwhats/locale";

@Injectable()
export class BotUpdate {
  @Command({ name: "ping" })
  async ping(
    @CurrentTranslate() t: TranslationFn,
    @Msg() message: NestWhatsMessage,
  ) {
    await message.reply(t("ping.response", { name: "World" }));
  }
}
```

`TranslationFn` signature: `(key: string, placeholders?: Record<string, string>) => string`

If called outside a nestwhats context, `t` returns the key as-is.

## 🏷️ Parameter decorators

| Decorator | Gives you |
|-----------|-----------|
| `@CurrentTranslate()` | The translation function for the resolved locale |
| `@CurrentLocale()` | The locale that won, or the fallback |
| `@DDI()` | The sender's country calling code, or `undefined` |

All three read one context resolved per message behind an `AsyncLocalStorage`,
so a service the handler delegates to sees the same answer with no argument
threaded through:

```typescript
@Command({ name: "ddi" })
async ddi(
  @Msg() message: NestWhatsMessage,
  @DDI() ddi: string | undefined,
  @CurrentLocale() locale: string,
) {
  await message.reply(ddi ? `+${ddi} -> ${locale}` : `no number, using ${locale}`);
}
```

`@DDI()` returning `undefined` is a normal answer, not a failure: a contact
identified by a LID publishes no number, and a group has none behind it.

`DDI_LOCALE` is the table behind it, country calling code to locale, and
`ddiOf` reads a code off a number — both exported for use outside a handler:

```typescript
import { DDI_LOCALE, ddiOf } from "@nestwhats/locale";

DDI_LOCALE["55"];              // 'pt-BR'
ddiOf("+55 31 98888-7777");    // '55'
```

## 📖 License

[GPL-3.0 License](https://github.com/NedcloarBR/NestWhats/blob/master/License)
