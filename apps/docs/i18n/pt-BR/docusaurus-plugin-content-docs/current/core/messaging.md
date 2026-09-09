---
sidebar_position: 7
title: Mensageria
description: Enviando de qualquer lugar, em qualquer adapter.
---

# Mensageria

Existem dois jeitos de enviar, com os mesmos métodos nos dois. Use o client
injetado quando você sabe qual é, e o serviço quando o client é escolhido em
runtime.

```typescript
// injected client
await this.client.sendMessage(chatId, 'hello');

// resolved by name
await this.messaging.sendMessage(chatId, 'hello', { client: 'business' });
```

Os dois recusam uma operação não suportada com as mesmas palavras.

## Texto e mídia

O `sendMessage` aceita os dois:

```typescript showLineNumbers
await client.sendMessage(chatId, 'hello');

await client.sendMessage(chatId, {
  data: await readFile('report.pdf'),
  mimetype: 'application/pdf',
  filename: 'report.pdf',
  caption: 'this month',
});
```

Mídia é uma capacidade — confira `AdapterCapability.SendMedia` se o código
precisa rodar em várias plataformas.

:::note Texto também nem sempre é permitido
O `sendMessage` está no contrato obrigatório porque é a operação pela qual um
adapter de WhatsApp existe, não porque toda plataforma sempre consegue. Uma API
de negócios tipicamente recusa texto livre fora de uma janela de atendimento e
só aceita um template aprovado. Essa é uma precondição por chat e dependente de
tempo, que flag de capacidade nenhuma expressa, então ela aparece como chamada
que falhou, não como capacidade ausente.
:::

## Todos os métodos

| Método | Exige |
|---|---|
| `sendMedia(chatId, media)` | `SendMedia` |
| `sendPresence(chatId, state)` | `Presence` |
| `sendSeen(chatId)` | `ReadReceipts` |
| `revokeMessage(messageId)` | `Revoke` |
| `getChats()` | `ListChats` |
| `getChat(chatId)` | `ReadChat` |
| `getContact(contactId)` | `ReadContact` |
| `createGroup(subject, ids)` | `CreateGroup` |
| `getAbout(contactId)` | `ReadAbout` |
| `setAbout(text)` | `SetAbout` |
| `setProfileName(name)` | `SetProfileName` |
| `setProfilePicture(media)` | `SetProfilePicture` |
| `setBlocked(contactId, blocked)` | `Block` |
| `postStatus(content, options?)` | `PostStatus` |
| `subscribePresence(contactId)` | `SubscribePresence` |
| `logout()` | `Logout` |

Todos eles são `async`, então uma capacidade que a plataforma não tem volta como
promise rejeitada — um `.catch` cobre tanto isso quanto uma falha na rede.

## Respondendo

Dentro de um handler, a mensagem responde a si mesma, citando a original:

```typescript
await message.reply('pong');
await message.reply({ data, mimetype: 'image/png', caption: 'here' });
```

## Indicador de digitação

```typescript
await client.sendPresence(chatId, PresenceState.Typing);
await doSomethingSlow();
await client.sendPresence(chatId, PresenceState.Paused);
```

## Variantes de número de telefone

Celulares brasileiros ganharam um `9` na frente nos anos 2010 e o WhatsApp é
inconsistente quanto a isso: o mesmo contato pode ser alcançável como
`5531988887777` ou `553188887777` dependendo de quando o número foi salvo e por
quem. Enviar para a forma errada falha em silêncio.

```typescript
import { brazilianPhoneVariants } from 'nestwhats';

for (const candidate of brazilianPhoneVariants('5531988887777')) {
  // try each, original first
}
```

Números não brasileiros voltam como uma entrada só.
