---
sidebar_position: 9
title: Structures and ids
description: The portable message, chat and contact, and how ids are normalised.
---

# Structures and ids

The core defines neutral shapes so a handler reads the same on every platform.
Each carries `raw`, typed as the platform's own object, for whatever the
contract does not cover.

## Ids are canonical

Platforms spell the same address differently. whatsapp-web.js says
`5511999@c.us` and Baileys says `5511999@s.whatsapp.net`. Adapters normalise at
their boundary, so your ids stay stable when the platform underneath changes.

| Suffix | What it points at |
|---|---|
| `@user` | A person |
| `@group` | A group |
| `@lid` | A linked id — WhatsApp's privacy-preserving address, no phone number |
| `@broadcast` | A broadcast list or status |
| `@newsletter` | A channel |

```typescript
import { isGroupJid, parseJid, bareId } from 'nestwhats';

isGroupJid(message.chatId);        // true for 'x@group'
parseJid('5511999@user');          // { user: '5511999', kind: JidKind.User }
bareId('5511999:12@user');         // '5511999' — device part removed
```

`bareId` matters more than it looks: WhatsApp addresses a specific linked device
as `user:device@server`, and the same contact reaches you with and without it
depending on the event. Comparing the raw ids would make two ids for one person,
and a check like "is this sender an admin" would silently fail.

:::info LIDs
WhatsApp is migrating towards linked ids, which identify a contact without
revealing the phone number. A `NestWhatsContact` from a LID has no `phone`, and
that is not an error — plan for the number being unavailable rather than
treating it as missing data.
:::

## Message

Required members are what every platform can answer; optional ones genuinely are
not universal.

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

Optional, so check the member first:

| Member | What it does |
|---|---|
| `downloadMedia()` | The attachment, or `undefined` if it expired |
| `react(emoji)` | Reacts; an empty string removes it |
| `edit(text)` | Replaces the text — `undefined` when refused |
| `forward(chatId)` | Sends it on, marked as forwarded |
| `delete(forEveryone?)` | Deletes it |
| `getChat()` / `getContact()` | The chat, or the sender |
| `getQuotedMessage()` | What it replies to |

`edit` returning `undefined` is a refusal, not a failure: the message is not
this account's, or WhatsApp's edit window — about 15 minutes — has closed.

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

Group management lives here, and is absent on a direct chat:
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

One portable payload; each adapter converts at its own boundary.

```typescript
const media: NestWhatsMedia = {
  data: Buffer,
  mimetype: 'image/png',
  filename: 'chart.png',
  caption: 'this month',
};
```
