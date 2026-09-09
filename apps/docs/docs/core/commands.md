---
sidebar_position: 3
title: Commands
description: Prefixes, arguments, aliases, groups and subcommands.
---

# Commands

A command is a method on a provider. The word after the prefix is what triggers
it.

```typescript title="src/app.handler.ts"
@Injectable()
export class AppHandler {
  @Command({ name: 'ping', description: 'Answers with pong' })
  public async onPing(@Message() message: NestWhatsMessage) {
    await message.reply('pong');
  }
}
```

## Options

| Field | Type | What it does |
|---|---|---|
| `name` | `string` | The word that triggers it, after the prefix |
| `description` | `string` | Shown by a help command, and in the dashboard |
| `aliases` | `string[]` | Other words that reach the same handler |
| `prefix` | `string` | Overrides the client's prefix for this command alone |
| `client` | `string \| string[]` | Restricts it to one or more named clients |

`client` is how one application runs different commands per number:

```typescript
@Command({ name: 'invoice', description: 'Sends the invoice', client: 'business' })
```

## Arguments

`@Args()` gives you everything after the command word, as one string:

```typescript
@Command({ name: 'echo', description: 'Repeats what you said' })
public async onEcho(@Message() message: NestWhatsMessage, @Args() args: string) {
  await message.reply(args || 'you said nothing');
}
```

`ArgIndex` picks positional arguments onto a DTO, and `rest: true` collects
everything from that position onwards:

```typescript showLineNumbers
export class BanDto {
  @ArgIndex(0)
  public user!: string;

  @ArgIndex(1, { rest: true })
  public reason!: string;
}

@Command({ name: 'ban', description: 'Bans someone' })
public async onBan(@Arguments(ParseArgs) dto: BanDto) {
  // !ban 5511999998888 spamming the group
  //   dto.user   = '5511999998888'
  //   dto.reason = 'spamming the group'
}
```

`ParseArgs` is the pipe that fills the DTO. Anything a Nest pipe can do —
validation, transformation — works here too.

## Groups and subcommands

A group turns one word into a namespace, reached as `!parent child`:

```typescript title="src/config.handler.ts" showLineNumbers
@Injectable()
@CommandGroup({ name: 'config', description: 'Bot settings' })
export class ConfigHandler {
  @GroupDefault()
  public async onConfig() {
    // !config
  }

  @Subcommand({ name: 'prefix', description: 'Changes the prefix' })
  public async onPrefix(@Args() args: string) {
    // !config prefix .
  }

  @Subcommand({ name: 'locale', description: 'Changes the language' })
  public async onLocale(@Args() args: string) {
    // !config locale pt-BR
  }
}
```

`@GroupDefault()` marks the method that runs when the group is called with no
subcommand — `!config` on its own.

## Parameter decorators

| Decorator | Gives you |
|---|---|
| `@Message()` | The `NestWhatsMessage` that triggered it |
| `@Args()` | Everything after the command word, as a string |
| `@Arguments(ParseArgs)` | The parsed DTO |
| `@Author()` | The sender's canonical id |
| `@Chat()` | The chat's canonical id |
| `@Client()` | The `NestWhatsClient` this message arrived on |
| `@Context()` | The `[client, message]` tuple |

`@Msg()` is an alias of `@Message()`, and `@Ctx()` of `@Context()`.

## Changing the prefix at runtime

The prefix is read per message, not captured when the client starts, so
changing it takes effect on the next message:

```typescript
this.registry.updatePrefix('personal', '.');
```

The dashboard exposes this as an editable field.
