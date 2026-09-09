---
sidebar_position: 8
title: Capabilities
description: What changes when you swap the platform, and how to ask.
---

# Capabilities

Platforms differ in what they can do. A browser session manages groups but
cannot post a status; a socket platform does both. A capability is how you ask
before you call.

## Checking what a client supports

Use `supports()` to ask, and the method to act:

```typescript
if (client.supports(AdapterCapability.PostStatus)) {
  await client.postStatus('good morning');
}
```

Calling one the platform lacks rejects with a `CapabilityNotSupportedError`,
which carries the capability as a field so you can branch on it:

```typescript showLineNumbers
try {
  await client.postStatus('good morning');
} catch (err) {
  if (err instanceof CapabilityNotSupportedError) {
    this.logger.warn(`${err.platform} cannot ${err.capability}`);
    return;
  }
  throw err;   // a real failure on the wire
}
```

It extends `NestWhatsError`, which every error NestWhats raises itself does.
Catching that separates "NestWhats refused" from "the platform failed".

## Skipping a handler on the wrong platform

`RequiresCapability` skips a handler on a client that cannot do what it needs:

```typescript
@Command({ name: 'story', description: 'Posts a status' })
@UseGuards(RequiresCapability(AdapterCapability.PostStatus))
public async onStory(@Message() message: NestWhatsMessage) {
  // reached only where postStatus exists
}
```

It takes several and requires all of them.

## The built-in capabilities

| Capability | Adapter method | What it covers |
|---|---|---|
| `sendMedia` | `sendMedia` | Attachments, not only text |
| `presence` | `sendPresence` | Typing and recording indicators |
| `readReceipts` | `sendSeen` | Marking a chat as read |
| `revoke` | `revokeMessage` | Deleting for everyone |
| `listChats` | `getChats` | Listing conversations |
| `readChat` | `getChat` | Fetching one conversation |
| `readContact` | `getContact` | Fetching one contact |
| `logout` | `logout` | Dropping the credentials |
| `createGroup` | `createGroup` | Starting a group |
| `readAbout` | `getAbout` | Reading someone's profile text |
| `setAbout` | `setAbout` | Changing your own profile text |
| `setProfileName` | `setProfileName` | Changing your display name |
| `setProfilePicture` | `setProfilePicture` | Changing your photo |
| `block` | `setBlocked` | Blocking and unblocking |
| `postStatus` | `postStatus` | Publishing to status/stories |
| `subscribePresence` | `subscribePresence` | Being told when a contact comes and goes |

`AdapterCapability` is both the union type and an object of these names, so
`AdapterCapability.SendMedia` and `'sendMedia'` are the same value.

## Adding your own capability

That table is the core's own; it is not the whole list. A platform package adds
its capabilities the same way it adds events:

```typescript
declare module 'nestwhats' {
  interface AdapterCapabilities {
    template: 'sendTemplate';
  }
}

registerCapability('template', 'sendTemplate');
```

The augmentation is the type side and vanishes at build; `registerCapability` is
the runtime side, called at module load. After that `client.supports('template')`
is checked at compile time and derived at runtime exactly like a built-in one.

Enumerate with `getKnownCapabilities()`, which includes what the loaded platform
packages registered.

## Turning a capability off

Sometimes implementing a method is not the same as being able to use it: the
same adapter class can do less for one account than for another. `unsupported`
takes capabilities away:

```typescript
export class MetaCloudAdapter implements NestWhatsAdapter<MetaClient> {
  public readonly unsupported = new Set([AdapterCapability.ListChats]);
}
```

It can only subtract. There is no way to claim a capability without implementing
it, and a capability added to the core later stays derived for every adapter
instead of being silently reported as missing.

## Features of a message or chat

Whether a message can be edited, or a group can list participants, is not a
capability. Ask the member itself:

```typescript
if (message.edit) await message.edit('corrected');
if (chat.addParticipants) await chat.addParticipants([id]);
```

This is more precise than a per-adapter flag: `chat.addParticipants` is absent
on a direct chat even where the platform has groups.
