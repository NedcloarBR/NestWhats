---
sidebar_position: 1
title: Introdução
description: O que é o NestWhats, e o que ele não é.
---

# NestWhats

O NestWhats é um framework NestJS para trabalhar com o WhatsApp. Ele cobre as
duas direções: ler o que chega, do mesmo jeito que você escreve controllers —
decoradores, injeção de dependência, guards, pipes, filters — e enviar de
qualquer lugar da aplicação através de um client injetado. O framework cuida da
conexão.

Um bot é o uso óbvio, e não o único: um número conectado é um provider como
qualquer outro, então o mesmo módulo serve notificações, alertas e o que mais o
produto precisar enviar.

```typescript
@Injectable()
export class AppHandler {
  @Command({ name: 'ping', description: 'Answers with pong' })
  public async onPing(@Message() message: NestWhatsMessage) {
    await message.reply('pong');
  }
}
```

## Agnóstico de plataforma desde a v4

O core não sabe o que é WhatsApp. Ele define estruturas neutras —
`NestWhatsMessage`, `NestWhatsChat`, `NestWhatsContact` — e um contrato de
adapter; um pacote de plataforma é que conecta numa biblioteca de WhatsApp de
verdade. É o mesmo formato que o próprio NestJS usa para Express e Fastify.

Isso importa porque as formas de chegar no WhatsApp diferem muito:

| | Como conecta | Custo por sessão |
|---|---|---|
| **whatsapp-web.js** | WhatsApp Web num navegador headless | ~1&nbsp;GB de RAM |
| **Baileys** | WebSocket, sem navegador | Megabytes |

Seus handlers não mudam quando você troca uma pela outra. O que *muda* é o que a
plataforma sabe fazer, e o NestWhats deixa isso explícito em vez de deixar
falhar em runtime — veja [Capacidades](/docs/core/capabilities).

## O que você ganha

- **Comandos** com prefixos, argumentos, grupos e subcomandos
- **Listeners** para todo evento que a plataforma emite, num vocabulário só
- **Guards, pipes e filters**, os do Nest que você já conhece
- **Vários clients numa aplicação**, cada um com sua sessão e seu prefixo
- **Um dashboard** para acompanhar conexões, ler QR codes e criar clients em runtime
- **Webhooks**, **i18n** e um **health indicator** para o Terminus

## O que ele não é

O NestWhats é uma biblioteca, não um servidor. Não tem banco de dados nem
armazenamento de mensagens: ele entrega o que a plataforma reporta e sai da
frente. Se você precisa de histórico numa plataforma que não guarda, guardar é
com você.

Ele também não torna uma plataforma não-oficial em oficial. whatsapp-web.js e
Baileys automatizam uma conta normal do WhatsApp, o que fere os termos de uso e
pode banir o número. O caminho sancionado para uma empresa é a Cloud API oficial
da Meta, e **não existe adapter para ela aqui** — então use o NestWhats num
número que você pode perder.

## Por onde começar

Primeira vez aqui? [Instalação](/docs/installation), e depois
[Primeiros passos](/docs/getting-started) monta um bot funcionando em poucos
minutos.
