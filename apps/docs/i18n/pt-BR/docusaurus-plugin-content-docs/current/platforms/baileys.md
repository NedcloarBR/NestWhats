---
sidebar_position: 3
title: Baileys
description: Uma conexão WebSocket com o WhatsApp, sem navegador.
---

# Baileys

O Baileys fala com o WhatsApp por um WebSocket, sem navegador nenhum. Uma
sessão custa megabytes em vez do gigabyte que o whatsapp-web.js precisa, que é
o que torna prático rodar muitos números num servidor só.

```bash npm2yarn
npm install @nestwhats/platform-baileys @whiskeysockets/baileys
```

O range de peer é `@whiskeysockets/baileys@^7.0.0-rc14`.

```typescript title="src/app.module.ts"
import { BaileysAdapterFactory } from '@nestwhats/platform-baileys';
import { NestWhatsClientConfig, NestWhatsModule } from 'nestwhats';

NestWhatsModule.forRoot({
  adapters: [new BaileysAdapterFactory({ authDir: '.baileys_auth' })],
  clients: [
    new NestWhatsClientConfig(BaileysAdapterFactory, { name: 'personal' }),
  ],
})
```

Cada client guarda a própria pasta `session-<nome>` dentro do `authDir`, então
dois clients nunca dividem uma sessão.

## Opções

O `BaileysAdapterOptions` estende o próprio `SocketConfig` do Baileys, menos
`auth` e `browser`, que são do adapter. Tudo que a biblioteca aceita, a factory
aceita; a tabela é o que este pacote acrescenta ou lê por conta própria.

| Opção | Padrão | O que faz |
|---|---|---|
| `authDir` | `.baileys_auth` | Onde as credenciais ficam |
| `phoneNumber` | — | Vincular por código de pareamento em vez de QR |
| `printAuthData` | `true` | Imprime o QR ou o código de pareamento no terminal |
| `deviceName` | `Ubuntu` | O que o celular mostra em *Dispositivos conectados* |
| `browserName` | `Chrome` | O navegador mostrado ao lado |
| `fetchLatestVersion` | `true` | Perguntar ao WhatsApp a versão Web atual antes de conectar |
| `logLevel` | `error` | Quanto do log do próprio Baileys chega ao Nest |
| `rejectCalls` | `false` | Recusar chamadas recebidas automaticamente |
| `passkey` | — | Assina o desafio de passkey do WhatsApp; veja abaixo |
| `passkeyTimeoutMs` | `60000` | Quanto esperar por uma resposta ao `passkeyChallenge` |
| `chatStore` | `true` | Acompanhar a lista de chats; veja [Listando chats](#listando-chats) |
| `chatStoreMax` | `1000` | Chats a manter, os menos ativos saem primeiro |
| `groupCache` | `true` | Lembrar os participantes de um grupo entre envios |
| `groupCacheTtlMs` | `300000` | Por quanto tempo uma lista de participantes em cache vale |
| `messageCacheMax` | `2000` | Mensagens a lembrar, para reenvios e revogações |

O `BaileysAdapterFactory` recebe todas essas mais `id`, que nomeia a factory
(padrão `baileys`).

As opções repassadas direto ao Baileys também valem conhecer:
`syncFullHistory`, `markOnlineOnConnect`, `qrTimeout`, `keepAliveIntervalMs`,
`connectTimeoutMs` e `defaultQueryTimeoutMs` aparecem todas no `optionsSchema`
do adapter, então [o dashboard](/docs/packages/dashboard) oferece elas na hora
de criar um client.

:::tip deviceName funciona aqui
No adapter do whatsapp-web.js esses dois são inertes, porque aquela biblioteca
os escreve por um módulo que o WhatsApp Web abandonou. O Baileys manda os dois
como a tripla de navegador, então eles aparecem no celular.
:::

## O que o adapter lembra

O Baileys não guarda nada entre restarts e pede à aplicação o que precisa de
volta. Três caches limitados respondem por isso, e cada um é uma opção simples:

| Cache | Opção | Por que existe |
|---|---|---|
| Mensagens | `messageCacheMax` | Responde ao `getMessage` do Baileys, então quem não conseguiu descriptografar uma recebe ela de novo em vez de ficar em *aguardando esta mensagem*. Também sustenta revogações, marcações de leitura e votos em enquete. Só conteúdo, nunca os bytes de mídia. |
| Metadata de grupo | `groupCache` | O Baileys pede a lista de participantes de um grupo toda vez que criptografa uma mensagem para ele. A FAQ dele aponta esse round trip por mensagem como o jeito de contas serem limitadas por taxa. Qualquer coisa que mude o grupo derruba a entrada, então uma lista velha nunca é usada. |
| Chats | `chatStore` | As conversas que este client conhece, vindas dos eventos que o WhatsApp manda. Só metadata, nunca mensagens. |

## Autenticando

Por padrão um client mostra um QR code. Defina `phoneNumber` e ele pede um
código de 8 dígitos, digitado em *Dispositivos conectados → Conectar com número
de telefone*:

```typescript
new NestWhatsClientConfig(BaileysAdapterFactory, {
  name: 'business',
  options: { phoneNumber: '5511999998888' },
})
```

### Passkeys

Algumas contas só conseguem vincular um dispositivo assinando um desafio
WebAuthn. Dê um signer à factory e ele serve todo client, virtuais inclusive:

```typescript
new BaileysAdapterFactory({ passkey: mySigner })
```

Sem um signer o desafio chega como evento, para ser respondido quando você
puder produzir a assertion:

```typescript
@BaileysOn('passkeyChallenge')
public onChallenge(@Context() [, challenge]: ContextOf<'passkeyChallenge'>) {
  challenge.resolve(assertion);   // or challenge.reject()
}
```

O `BaileysMessagingService` expõe `resolvePasskey` e `rejectPasskey` para a
mesma coisa fora de um handler, e o `passkeyResult` reporta como o pareamento
terminou.

:::warning Protocolo não documentado
O handshake de passkey não faz parte do Baileys. Este adapter fala ele direto
no socket cru, e os números de campo vêm de observar o WhatsApp Web. Está
verificado contra a `7.0.0-rc14`; uma mudança do lado do WhatsApp pode quebrar.
:::

## O que ele acrescenta sobre uma sessão de navegador

Duas capacidades que o whatsapp-web.js não tem de jeito nenhum:

```typescript
await client.postStatus('good morning', { audience: [contactId] });

await client.subscribePresence(contactId);
client.on('presenceUpdate', ({ state, lastSeenAt }) => { /* … */ });
```

O `lastSeenAt` está ausente muito mais vezes do que presente, porque o WhatsApp
esconde isso por padrão. Trate a ausência como "não visível", nunca como "nunca
visto".

## Capacidades que só o Baileys tem

O vocabulário de capacidades é aberto, então este pacote registra as dele em vez
de escondê-las atrás do `raw`:

| Capacidade | O que cobre |
|---|---|
| `createCommunity` / `readCommunity` | Comunidades, os grupos que seguram grupos |
| `createNewsletter` / `readNewsletter` | Canais, por id ou código de convite |
| `joinGroup` | Entrar num grupo por código de convite |
| `previewInvite` | Espiar um grupo antes de entrar |
| `setDisappearing` | O timer padrão da conta para chats novos |
| `rejectCall` | Recusar uma chamada recebida |
| `readPrivacy` / `setPrivacy` | As configurações de privacidade da conta |

Elas são conferidas e derivadas exatamente como as embutidas:

```typescript
if (client.supports('createCommunity')) {
  await client.createCommunity('Neighbourhood');
}
```

## Listando chats

O `getChats()` devolve as conversas diretas que este client já viu, mais todo
grupo em que ele está.

O Baileys é stateless por projeto, e a documentação dele é explícita que manter
uma lista de chats é trabalho da aplicação — então o adapter mantém uma, a
partir dos eventos que o WhatsApp manda. Esse store é o que preenche nome,
contagem de não lidas, arquivado, fixado, silenciado e última atividade de um
chat, e o que permite uma conversa direta ser listada. Os grupos são pedidos
por cima disso, porque o WhatsApp responde por eles quando perguntado e a
metadata deles carrega o assunto e os participantes.

Defina `chatStore: false` e o método volta a ser só grupos.

```typescript
const chats = await client.getChats();
const unread = chats.filter((chat) => chat.unreadCount > 0);

await chats[0].archive();
await chats[0].mute(8 * 60 * 60 * 1000);
await chats[0].markRead();
```

:::note Uma sessão nova não sabe de nada
O store enche a partir do sync de histórico e do tráfego, então um client
recém-vinculado lista pouco até o WhatsApp mandar alguma coisa. O
`syncFullHistory` decide quanto chega nesse primeiro vínculo.
:::

## Eventos

Todo evento do Baileys está disponível e tipado pelo `@BaileysOn`, sob um nome
em camelCase — `message-receipt.update` vira `messageReceiptUpdate`:

```typescript
@BaileysOn('messagesUpdate')
public onUpdate(@Context() [, updates]: ContextOf<'messagesUpdate'>) {}
```

A lista nativa é derivada do próprio `BaileysEventMap` do Baileys, e uma
checagem em tempo de compilação quebra o build nomeando qualquer evento que a
dependência acrescentar e este pacote não tiver listado.

Três eventos não vêm de evento nenhum do Baileys:

| Evento | Carrega |
|---|---|
| `passkeyChallenge` | O WhatsApp pediu a passkey da conta e não há signer configurado |
| `passkeyResult` | Como um pareamento por passkey terminou |
| `pollVote` | Alguém votou numa enquete, com a apuração inteira |

```typescript
@BaileysOn('pollVote')
public onVote(@Context() [, vote]: ContextOf<'pollVote'>) {}
```

Um voto é criptografado contra a enquete que ele responde, então o `pollVote`
só dispara enquanto aquela enquete ainda está no cache de mensagens — o
`messageCacheMax` é o que decide até onde isso alcança.

:::note `call` precisa de `@BaileysOn`
O `call` é deixado de fora da augmentation global de propósito. O pacote do
whatsapp-web.js declara um evento de mesmo nome com payload diferente, e duas
augmentations discordando sobre uma propriedade é erro de compilação em
qualquer aplicação que instale os dois. O evento continua disparando; o
`@BaileysOn('call')` tipa ele, o `@On('call')` não.
:::

## Chegando no Baileys direto

O `BaileysMessagingService.sendRaw` envia qualquer `AnyMessageContent` com a
superfície inteira de opções, com os ids normalizados antes:

```typescript
await this.baileys.sendRaw(chatId, { text: 'hi', mentions: [id] });
```

O socket em si está no `client.raw`.
