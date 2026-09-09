---
sidebar_position: 4
title: Escrevendo um adapter
description: O contrato que um pacote de plataforma implementa.
---

# Escrevendo um adapter

Um pacote de plataforma entrega duas classes: o **adapter**, que é a conexão de
um client, e uma **factory**, que guarda a configuração compartilhada e
constrói um adapter por client.

## O adapter emite dois eventos

Esse é o contrato de eventos obrigatório inteiro:

```typescript showLineNumbers
interface NestWhatsAdapterEvents {
  connectionUpdate: [update: ConnectionUpdate];
  messageUpsert: [message: NestWhatsMessage];
}

interface ConnectionUpdate {
  status: ClientStatus;
  qr?: string;               // platforms that authenticate by QR
  pairingCode?: string;      // platforms that pair by phone code
  reason?: DisconnectReason; // why it closed
}
```

O core deriva `qr`, `pairingCode`, `authenticated`, `ready` e `disconnected` do
`connectionUpdate`, e rastreia as transições sozinho — nunca emita esses cinco,
e nunca tente lembrar qual você já mandou.

Todo campo menos `status` é opcional, então uma plataforma reporta o que ela de
fato tem: o whatsapp-web.js manda um QR, e o Baileys manda um QR *ou* um código
de pareamento. Uma plataforma sem sessão nenhuma não mandaria nenhum dos dois e
simplesmente começaria em `Ready` — o contrato permite isso, e é o que mantém
um adapter baseado em webhook possível.

## Os métodos obrigatórios

`initialize`, `destroy`, `on`/`once`/`off`, `getInfo`, `sendMessage` e `raw`.
Todo o resto é opcional, e **implementar é a declaração** — o
`supportsCapability` lê o método, então não há uma segunda lista para manter em
sincronia.

```typescript
export class MyAdapter extends EventEmitter implements NestWhatsAdapter<MyClient> {
  public async sendMessage(chatId: string, content: string) { /* … */ }

  // optional — implementing it is what announces AdapterCapability.Presence
  public async sendPresence(chatId: string, state: PresenceState) { /* … */ }
}
```

## A factory

```typescript title="src/factory.ts" showLineNumbers
export class MyAdapterFactory implements NestWhatsAdapterFactory<MyAdapter, MyOptions> {
  public readonly id = 'my-platform';
  public readonly platform = MY_PLATFORM;            // badge for a UI
  public readonly optionsSchema = MY_OPTIONS_SCHEMA; // form fields for a UI

  public constructor(private readonly config: MyOptions = {}) {}

  public create(clientName: string, options?: MyOptions): MyAdapter {
    return new MyAdapter({ ...this.config, ...options }, clientName);
  }
}
```

Três coisas seguem dessa separação:

- **Nada que identifique é compartilhado.** Credenciais e diretórios de sessão
  são derivados dentro do `create`, a partir do `clientName` ou das opções
  daquele client.
- **Uma plataforma pode exigir algo por client e dizer isso no boot.** Lance
  erro no `create` em vez de subir dois clients na mesma conta caladamente.
- **`platform` e `optionsSchema` descrevem a plataforma, não uma conexão,**
  então um dashboard desenha o selo e o formulário antes de existir client
  algum.

O `id` é o que um client nomeia e o que é gravado no storage de um virtual
client, então ele precisa sobreviver a um restart e a um minificador.

## Normalize ids na fronteira

Converta para a grafia canônica (`@user`, `@group`, `@lid`) na entrada, e de
volta para a da plataforma na saída. Aí os ids continuam estáveis quando alguém
trocar a plataforma por baixo.

## Estenda o vocabulário, não alargue o core

Se a sua plataforma tem um recurso para o qual o core não tem nome, registre
uma capacidade do seu próprio pacote em vez de escondê-la atrás do `raw`:

```typescript
declare module 'nestwhats' {
  interface AdapterCapabilities {
    template: 'sendTemplate';
  }
}

registerCapability('template', 'sendTemplate');
```

O mesmo vale para eventos, pelo `NestWhatsBaseEvents`.

## Publique só ESM

Um build, `"type": "module"`, sem condição `require`. Um pacote dual é avaliado
duas vezes no mesmo processo, o que dá duas identidades a cada classe e quebra
o injetor do Nest.

Duas regras seguem disso:

- **Nada de top-level await.** O `require()` recusa um módulo assíncrono, então
  um `await` no topo de um arquivo publicado quebra todo consumidor CommonJS.
- **Tudo que um consumidor possa segurar atravessando a fronteira do pacote** —
  um token de injeção, uma chave de metadata — passa por `Symbol.for`, nunca
  por um `Symbol()` simples.
