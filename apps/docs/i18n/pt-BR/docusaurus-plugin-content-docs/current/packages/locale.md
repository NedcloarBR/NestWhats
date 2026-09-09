---
sidebar_position: 3
title: Locale
description: Respostas no idioma de quem está escrevendo.
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

## Traduzindo

```typescript
@Command({ name: 'hello', description: 'Greets you' })
public async onHello(
  @Message() message: NestWhatsMessage,
  @CurrentTranslate() t: TranslationFn,
) {
  await message.reply(t('greeting.hello', { name: 'Ned' }));
}
```

Placeholders usam `{{ name }}`. O `NestedLocaleAdapter` lê JSON aninhado, então
`greeting.hello` mapeia para `{ "greeting": { "hello": "…" } }`.

## Escolhendo o idioma

Resolvers decidem, em ordem, qual idioma uma mensagem recebe. O
`PhoneCountryResolver` lê o código do país a partir do número de quem enviou —
um `+55` escreve para um bot brasileiro em português sem ninguém configurar
nada.

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

Escreva o seu resolver implementando `LocaleResolver` — lendo uma preferência
guardada, ou uma configuração por chat. O argumento `hints` carrega o que o
interceptor já descobriu, então um resolver que só precisa do código de país
não paga a busca de novo.

## Decorators de parâmetro

| Decorator | Entrega |
|---|---|
| `@CurrentTranslate()` | A função de tradução do idioma resolvido |
| `@CurrentLocale()` | O idioma que venceu, ou o fallback |
| `@DDI()` | O código de país de quem enviou, ou `undefined` |

Os três leem um contexto só, resolvido uma vez por mensagem, então um serviço
para o qual o handler delega enxerga a mesma resposta sem argumento nenhum
sendo passado adiante.

O `DDI_LOCALE` é a tabela por trás deles, código de país para idioma, e é
exportada para consulta direta:

```typescript
import { DDI_LOCALE, ddiOf } from '@nestwhats/locale';

DDI_LOCALE['55'];              // 'pt-BR'
ddiOf('+55 31 98888-7777');    // '55'
```

:::note LIDs não têm número de telefone
Um contato identificado por LID não publica número, então o
`PhoneCountryResolver` não tem o que responder e o idioma de fallback é usado.
Isso não é falha: o WhatsApp está caminhando para esses ids, então planeje para
o número estar indisponível.
:::

## Guardando uma preferência

O `LocaleStorage` mantém uma escolha por chat ou por contato, para um comando
`!config locale` sobrescrever o que os resolvers adivinharam.
