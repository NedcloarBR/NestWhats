---
sidebar_position: 3
title: Locale
description: Replies in the language of whoever is writing.
---

# Locale

```bash npm2yarn
npm install @nestwhats/locale
```

```typescript title="src/app.module.ts" showLineNumbers
NestWhatsLocaleModule.forRoot({
  adapter: new NestedLocaleAdapter({
    fallbackLocale: 'en-US',
    locales: new JSONLocaleLoader({
      basePath: join(import.meta.dirname, '..', 'locales'),
    }),
  }),
  resolvers: [new PhoneCountryResolver()],
})
```

## Translating

```typescript
@Command({ name: 'hello', description: 'Greets you' })
public async onHello(
  @Message() message: NestWhatsMessage,
  @CurrentTranslate() t: TranslationFn,
) {
  await message.reply(t('greeting.hello', { name: 'Ned' }));
}
```

Placeholders use `{{ name }}`. `NestedLocaleAdapter` reads nested JSON, so
`greeting.hello` maps to `{ "greeting": { "hello": "…" } }`.

## Choosing the locale

Resolvers decide, in order, which language a message gets.
`PhoneCountryResolver` reads the country code from the sender's number — a
`+55` writes to a Brazilian bot in Portuguese without anyone configuring
anything.

```typescript
@Command({ name: 'ddi', description: 'Shows your country code' })
public async onDdi(
  @Message() message: NestWhatsMessage,
  @DDI() ddi: string | undefined,
  @CurrentLocale() locale: string,
) {
  await message.reply(ddi ? `+${ddi} -> ${locale}` : `no number, using ${locale}`);
}
```

Write your own resolver by implementing `LocaleResolver` — reading a stored
preference, or a per-chat setting. The `hints` argument carries what the
interceptor already worked out, so a resolver that only needs the country code
does not pay for the lookup again.

## Parameter decorators

| Decorator | Gives you |
|---|---|
| `@CurrentTranslate()` | The translation function for the resolved locale |
| `@CurrentLocale()` | The locale that won, or the fallback |
| `@DDI()` | The sender's country calling code, or `undefined` |

All three read one context resolved per message, so a service the handler
delegates to sees the same answer with no argument threaded through.

`DDI_LOCALE` is the table behind them, country calling code to locale, and it
is exported for looking one up directly:

```typescript
import { DDI_LOCALE, ddiOf } from '@nestwhats/locale';

DDI_LOCALE['55'];              // 'pt-BR'
ddiOf('+55 31 98888-7777');    // '55'
```

:::note LIDs have no phone number
A contact identified by a LID publishes no number, so `PhoneCountryResolver`
cannot answer and the fallback locale is used. That is not a failure: WhatsApp
is moving towards these ids, so plan for the number being unavailable.
:::

## Storing a preference

`LocaleStorage` keeps a per-chat or per-contact choice, so a `!config locale`
command can override what the resolvers guessed.
