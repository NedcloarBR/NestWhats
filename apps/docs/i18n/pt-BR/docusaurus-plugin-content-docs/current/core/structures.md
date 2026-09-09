---
sidebar_position: 9
title: Estruturas e ids
description: A mensagem, o chat e o contato portáveis, e como os ids são normalizados.
---

# Estruturas e ids

O core define formatos neutros para um handler ler igual em toda plataforma.
Cada um carrega `raw`, tipado como o objeto da própria plataforma, para o que o
contrato não cobre.

## Ids são canônicos

Plataformas escrevem o mesmo endereço de jeitos diferentes. O whatsapp-web.js
diz `5511999@c.us` e o Baileys diz `5511999@s.whatsapp.net`. Os adapters
normalizam na fronteira deles, então seus ids continuam estáveis quando a
plataforma por baixo muda.

| Sufixo | Para o que aponta |
|---|---|
| `@user` | Uma pessoa |
| `@group` | Um grupo |
| `@lid` | Um linked id — o endereço do WhatsApp que preserva privacidade, sem número |
| `@broadcast` | Uma lista de transmissão ou status |
| `@newsletter` | Um canal |

```typescript
import { isGroupJid, parseJid, bareId } from 'nestwhats';

isGroupJid(message.chatId);        // true for 'x@group'
parseJid('5511999@user');          // { user: '5511999', kind: JidKind.User }
bareId('5511999:12@user');         // '5511999' — device part removed
```

O `bareId` importa mais do que parece: o WhatsApp endereça um dispositivo
vinculado específico como `user:device@server`, e o mesmo contato chega até
você com e sem isso dependendo do evento. Comparar os ids crus criaria dois ids
para uma pessoa, e uma checagem tipo "quem enviou é admin" falharia em silêncio.

:::info LIDs
O WhatsApp está migrando para linked ids, que identificam um contato sem
revelar o número de telefone. Um `NestWhatsContact` vindo de um LID não tem
`phone`, e isso não é erro — planeje para o número estar indisponível em vez de
tratar como dado faltando.
:::

## Message

Os membros obrigatórios são o que toda plataforma sabe responder; os opcionais
realmente não são universais.

```typescript showLineNumbers
message.id;                // platform id
message.chatId;            // where
message.senderId;          // who — the participant in groups
message.fromMe;            // sent by this client
message.body;              // text, or a media caption
message.type;              // NestWhatsMessageType
message.timestamp;         // epoch ms
message.hasMedia;
message.hasQuotedMessage;
message.mentionedIds;

await message.reply(content);
```

Opcionais, então confira o membro antes:

| Membro | O que faz |
|---|---|
| `downloadMedia()` | O anexo, ou `undefined` se expirou |
| `react(emoji)` | Reage; string vazia remove |
| `edit(text)` | Substitui o texto — `undefined` quando recusado |
| `forward(chatId)` | Encaminha, marcada como encaminhada |
| `delete(forEveryone?)` | Apaga |
| `getChat()` / `getContact()` | O chat, ou quem enviou |
| `getQuotedMessage()` | A que ela responde |

O `edit` devolver `undefined` é recusa, não falha: a mensagem não é desta conta,
ou a janela de edição do WhatsApp — uns 15 minutos — já fechou.

## Chat

```typescript showLineNumbers
chat.id;
chat.name;            // group subject, or the contact's name
chat.description;     // groups only
chat.isGroup;
chat.unreadCount;
chat.lastMessageAt;
chat.archived; chat.pinned; chat.muted;

await chat.sendMessage(content);
```

A administração de grupo mora aqui, e está ausente numa conversa direta:
`addParticipants`, `removeParticipants`, `promoteParticipants`,
`demoteParticipants`, `setSubject`, `setDescription`, `getInviteCode`,
`revokeInvite`, `leave`.

## Contact

```typescript showLineNumbers
contact.id;
contact.phone;          // absent for a LID
contact.displayName;    // what they publish
contact.savedName;      // what you saved them as
contact.isMe;
contact.isBusiness;
contact.isBlocked;

await contact.getProfilePictureUrl();
```

## Media

Um payload portável só; cada adapter converte na fronteira dele.

```typescript
const media: NestWhatsMedia = {
  data: Buffer,
  mimetype: 'image/png',
  filename: 'chart.png',
  caption: 'this month',
};
```
