---
sidebar_position: 3
title: Primeiros passos
description: Um bot funcionando, do projeto vazio até a resposta no seu celular.
---

# Primeiros passos

Isto monta um bot que responde `!ping`. Usa o whatsapp-web.js, que dirige uma
sessão real do WhatsApp Web — você vai ler um QR code com o celular.

:::warning
Uma plataforma não oficial automatiza uma conta comum do WhatsApp, o que fere
os termos de serviço e pode banir o número. Use um número que você pode perder
enquanto está aprendendo.
:::

## 1. Registre o módulo

O array `adapters` recebe uma **factory** — a coisa que constrói um adapter por
client, guardando a configuração que eles compartilham. `clients` nomeia os
clients que vão subir.

```typescript title="src/app.module.ts" showLineNumbers
import { Module } from '@nestjs/common';
import { NestWhatsClientConfig, NestWhatsModule } from 'nestwhats';
import {
  LocalAuth,
  WhatsAppWebJsAdapterFactory,
} from '@nestwhats/platform-whatsapp-web.js';
import { AppHandler } from './app.handler';

@Module({
  imports: [
    NestWhatsModule.forRoot({
      adapters: [
        new WhatsAppWebJsAdapterFactory({
          authStrategy: new LocalAuth(),
        }),
      ],
      clients: [
        new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, {
          name: 'personal',
          prefix: '!',
        }),
      ],
    }),
  ],
  providers: [AppHandler],
})
export class AppModule {}
```

:::tip
Importe o `LocalAuth` do pacote de plataforma, não do `whatsapp-web.js`. Aquela
biblioteca é CommonJS, e sob ESM os named exports dela chegam `undefined` sem
erro nenhum até alguém tentar ler. O pacote de plataforma reexporta os valores
que funcionam.
:::

## 2. Escreva um handler

Um handler é um provider comum. Decore os métodos e injete o que precisar.

```typescript title="src/app.handler.ts" showLineNumbers
import { Injectable } from '@nestjs/common';
import { Command, Message, On, type NestWhatsMessage } from 'nestwhats';

@Injectable()
export class AppHandler {
  @Command({ name: 'ping', description: 'Answers with pong' })
  public async onPing(@Message() message: NestWhatsMessage) {
    await message.reply('pong');
  }

  @On('ready')
  public onReady() {
    console.log('connected');
  }
}
```

## 3. Suba

```typescript title="src/main.ts"
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const app = await NestFactory.createApplicationContext(AppModule);
app.enableShutdownHooks();
```

O `enableShutdownHooks()` importa: é ele que fecha o navegador e a sessão
direito no Ctrl+C.

Rode, leia o QR code impresso no terminal e mande `!ping` para o número de
outro celular.

## O que ler depois

- [O módulo](/docs/core/module) — vários clients, configuração assíncrona, virtual clients
- [Comandos](/docs/core/commands) — argumentos, grupos, subcomandos
- [Capacidades](/docs/core/capabilities) — o que muda quando você troca de plataforma
- [Dashboard](/docs/packages/dashboard) — uma UI web para o QR code e o estado da conexão
