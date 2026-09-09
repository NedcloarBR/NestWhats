---
sidebar_position: 4
title: Listeners
description: O vocabulário de eventos, e como ele continua o mesmo entre plataformas.
---

# Listeners

O `@On()` assina enquanto o client viver; o `@Once()` dispara uma vez só.

```typescript title="src/bot.listener.ts" showLineNumbers
@Injectable()
export class BotListener {
  @On('ready')
  public onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`${client.name} connected`);
  }

  @Once('qr')
  public onFirstQr(@Context() [, qr]: ContextOf<'qr'>) {
    this.logger.log(`scan this once: ${qr}`);
  }
}
```

O `ContextOf<'evento'>` tipa a tupla: o client primeiro, depois os argumentos
do próprio evento.

## Eventos base

Disponíveis em todo adapter, seja qual for a plataforma.

| Evento | Argumentos | Quando |
|---|---|---|
| `connectionUpdate` | `ConnectionUpdate` | Estado cru vindo do adapter |
| `messageUpsert` | `NestWhatsMessage` | Qualquer mensagem, enviada ou recebida |
| `messageStatus` | `NestWhatsMessageStatusUpdate` | Uma mensagem enviada foi entregue, lida ou falhou |
| `presenceUpdate` | `NestWhatsPresenceUpdate` | Um contato ficou online, saiu, ou está digitando |
| `qr` | `string` | Um novo payload de QR para renderizar |
| `pairingCode` | `string` | O código a digitar no celular |
| `authenticated` | — | Credenciais aceitas; ainda não dá para usar |
| `ready` | — | Conectado e apto a enviar |
| `disconnected` | `DisconnectReason \| undefined` | O client caiu |

`qr`, `pairingCode`, `authenticated`, `ready` e `disconnected` são **derivados**
pelo core a partir do `connectionUpdate`. Um adapter reporta estado; o core
decide o que aquilo significa, e é por isso que eventos de status só disparam em
transição real — plataformas repetem o estado delas a cada reconexão, e um
segundo `ready` derrotaria o `@Once`.

Prefira os eventos derivados. O `connectionUpdate` está ali para quando você
precisar do fluxo cru.

## Eventos de plataforma

Tudo que uma plataforma oferece além do contrato mantém o nome próprio,
adicionado por module augmentation. Com o
`@nestwhats/platform-whatsapp-web.js` importado, todo evento do whatsapp-web.js
fica disponível e tipado:

```typescript
@On('messageReaction')
public onReaction(@Context() [, reaction]: ContextOf<'messageReaction'>) {}
```

Assinar um evento que o adapter não sabe emitir é recusado em vez de nunca
disparar em silêncio — o adapter declara o que suporta, e o core confere.

## Restringindo a um client

```typescript
@On('ready', { client: 'business' })
public onBusinessReady() {}
```

## Assinando fora de um handler

Um client injetado carrega o mesmo vocabulário, e o `on` devolve a função que
cancela a assinatura:

```typescript
const stop = this.client.on('messageStatus', (update) => { /* … */ });
stop();
```

Em qual emissor o evento vive — o core para os derivados, o adapter para os da
plataforma — já vem decidido para você.
