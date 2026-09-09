---
sidebar_position: 1
title: Choosing a platform
description: What ships today, and what each way of reaching WhatsApp costs you.
---

# Choosing a platform

The core is platform-agnostic; a platform package does the connecting. Two exist.

| | whatsapp-web.js | Baileys |
|---|---|---|
| How it connects | Headless browser | WebSocket |
| Memory per session | ~1 GB | Megabytes |
| List conversations | All chats | Direct chats and groups |
| Chat state: archive, pin, mute, read | No | Yes |
| Group administration | Participants, subject, description, invite link | Those, plus the picture, locking, join approvals and linked groups |
| Status / stories | No | Yes |
| Presence, "last seen" | No | Yes |
| Communities, channels | No | Yes |
| Join or preview a group invite | No | Yes |
| Decline incoming calls | No | Yes |
| Privacy settings | No | Yes |
| Default disappearing timer | No | Yes |
| Passkey linking | No | Yes |
| Poll votes | Yes, as `voteUpdate` | Yes, as `pollVote` |

:::danger Both automate a personal account
whatsapp-web.js and Baileys drive a normal WhatsApp account. That is against
WhatsApp's terms of service, and the number can be banned without warning or
appeal.

The sanctioned route for a business is Meta's official Cloud API, and
**NestWhats has no adapter for it today**. If you need one, this library is not
yet the right tool — use Meta's SDK directly, or one of the platforms built
around it.

Use NestWhats on a number you can afford to lose: a personal project, an
internal tool, a prototype.
:::

## How to choose

**Prototyping, or one personal number.** whatsapp-web.js. It supports the widest
feature set because it is the real web client, and a gigabyte of RAM does not
matter for one session.

**Many numbers, or a small server.** Baileys. No browser means
sessions cost megabytes instead of gigabytes, and it does a good deal the web
client cannot: posting status, watching presence, communities and channels,
declining calls, and reading the account's privacy settings.

Its chat list is kept by the adapter rather than by the library, which has one
consequence worth knowing: a client that has just linked knows little until
WhatsApp has sent it something. `syncFullHistory` decides how much arrives on
that first link, and `chatStore: false` turns the whole thing off, leaving
`getChats()` with groups only.

## Changing platform

Your handlers do not change. What changes is what the platform can do, and the
capability system is how that surfaces:

```typescript
if (client.supports(AdapterCapability.ListChats)) {
  const chats = await client.getChats();
}
```

Write against the contract, check capabilities where it matters, and reach for
`raw` only where you accept being tied to one platform. Then the swap is a
change in `forRoot` and nothing else.

## Writing your own

The contract is deliberately small — small enough that a platform with no
session at all could satisfy it, which is what keeps the door open for an
official-API adapter later. See
[Writing an adapter](./writing-an-adapter.md).
