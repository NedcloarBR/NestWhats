---
sidebar_position: 2
title: whatsapp-web.js
description: Uma sessão real do WhatsApp Web num navegador headless.
---

# whatsapp-web.js

```bash npm2yarn
npm install @nestwhats/platform-whatsapp-web.js whatsapp-web.js
```

```typescript title="src/app.module.ts" showLineNumbers
import {
  LocalAuth,
  WhatsAppWebJsAdapterFactory,
} from '@nestwhats/platform-whatsapp-web.js';

NestWhatsModule.forRoot({
  adapters: [
    new WhatsAppWebJsAdapterFactory({
      printAuthData: true,
      authStrategy: new LocalAuth(),
      puppeteer: { args: ['--no-sandbox'] },
    }),
  ],
  clients: [
    new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, { name: 'personal' }),
  ],
})
```

:::tip Importe deste pacote, não do whatsapp-web.js
O `whatsapp-web.js` é CommonJS, e a detecção de named exports do Node deixa
`Events`, `LocalAuth`, `MessageMedia`, `MessageTypes` e `WAState` como
`undefined` quando um módulo ES importa direto — sem erro nenhum, até alguém
tentar ler. Este pacote reexporta os valores que funcionam.
:::

## Opções

Tudo que o `ClientOptions` aceita, mais:

| Opção | Padrão | O que faz |
|---|---|---|
| `printAuthData` | `true` | Imprime o QR — ou o código de pareamento — no terminal |
| `id` | `whatsapp-web.js` | Nomeia a factory, para registrá-la duas vezes |

Cada client ganha o próprio `LocalAuth`, nomeado a partir do client, então cada
um mantém um diretório de sessão separado sob `.wwebjs_auth/`.

O `authTimeoutMs` aqui tem padrão de **120s** em vez dos 30s que o upstream usa:
aquele padrão assume um client só, enquanto o NestWhats costuma subir vários
navegadores de uma vez e os últimos perdem essa corrida em hardware modesto.

## Autenticando

Por padrão um client mostra um QR code. Defina `pairWithPhoneNumber` e ele pede
um código de 8 dígitos, digitado no celular em *Dispositivos conectados →
Conectar com número de telefone*:

```typescript
new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, {
  name: 'business',
  options: { pairWithPhoneNumber: { phoneNumber: '5511999998888' } },
})
```

De um jeito ou de outro o valor chega aos handlers como `qr` ou `pairingCode`,
e o dashboard mostra o que se aplicar.

## O que ele sabe e não sabe fazer

Ele implementa todo método opcional do contrato **menos dois**, e esses são os
que o próprio WhatsApp Web não oferece:

| Não suportado | Por quê |
|---|---|
| `postStatus` | Não há API para publicar no status |
| `subscribePresence` | Não há API para acompanhar presença, então "visto por último" também não |

Todo o resto responde verdadeiro: mídia, indicadores de presença, confirmação
de leitura, revogações, busca de chat e contato, logout, criação e
administração de grupo, nome/foto/recado do perfil, e bloqueio. Nas estruturas
ele também implementa `message.edit`, `message.forward` e `chat.description`.

## Desligamento

O Puppeteer instala um handler próprio de `SIGINT` que chama
`process.exit(130)`, o que mataria o app antes de o Nest rodar os shutdown
hooks. Este adapter desliga esses handlers — o Nest é dono do ciclo de vida, e
o `destroy()` fecha o navegador. Chame `app.enableShutdownHooks()` e o Ctrl+C
encerra direito.

## Problemas conhecidos do upstream

`deviceName` e `browserName` fazem parte do `ClientOptions` mas **hoje não têm
efeito nenhum**. O whatsapp-web.js aplica os dois sobrescrevendo o `info()` de
um módulo do WhatsApp Web que não expõe mais isso — verificado contra a 1.34.7
— então o celular mostra o que ele detectar. As opções ficam ali porque voltam
a funcionar se o upstream consertar.
