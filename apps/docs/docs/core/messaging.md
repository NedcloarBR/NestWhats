---
sidebar_position: 7
title: Messaging
description: Sending from anywhere, on any adapter.
---

# Messaging

There are two ways to send, with the same methods on both. Use the injected
client when you know which one, and the service when the client is chosen at
runtime.

```typescript
// injected client
await this.client.sendMessage(chatId, 'hello');

// resolved by name
await this.messaging.sendMessage(chatId, 'hello', { client: 'business' });
```

Both refuse an unsupported operation in the same words.

## Text and media

`sendMessage` takes either:

```typescript showLineNumbers
await client.sendMessage(chatId, 'hello');

await client.sendMessage(chatId, {
  data: await readFile('report.pdf'),
  mimetype: 'application/pdf',
  filename: 'report.pdf',
  caption: 'this month',
});
```

Media is a capability — check `AdapterCapability.SendMedia` if the code has to
run on several platforms.

:::note Text is not always allowed either
`sendMessage` is on the mandatory contract because it is the operation a
WhatsApp adapter exists for, not because every platform can always do it. A
business API typically refuses free-form text outside a service window and
accepts only an approved template. That is a per-chat, time-dependent
precondition no capability flag can express, so it surfaces as a failed call
rather than as a missing capability.
:::

## Every method

| Method | Requires |
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

Every one of them is `async`, so a capability the platform lacks comes back as a
rejected promise — one `.catch` covers both that and a failure on the wire.

## Replying

Inside a handler, the message replies to itself, quoting the original:

```typescript
await message.reply('pong');
await message.reply({ data, mimetype: 'image/png', caption: 'here' });
```

## Typing indicators

```typescript
await client.sendPresence(chatId, PresenceState.Typing);
await doSomethingSlow();
await client.sendPresence(chatId, PresenceState.Paused);
```

## Phone number variants

Brazilian mobile numbers gained a leading `9` in the 2010s and WhatsApp is
inconsistent about it: the same contact may be reachable as `5531988887777` or
`553188887777` depending on when the number was saved and by whom. Sending to
the wrong form silently fails.

```typescript
import { brazilianPhoneVariants } from 'nestwhats';

for (const candidate of brazilianPhoneVariants('5531988887777')) {
  // try each, original first
}
```

Non-Brazilian numbers come back as a single entry.
