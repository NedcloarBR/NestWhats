---
sidebar_position: 6
title: Guards, pipes and filters
description: The Nest ones you already know, plus a few of ours.
---

# Guards, pipes and filters

Handlers run through the standard Nest execution pipeline, so
[`@UseGuards()`](https://docs.nestjs.com/guards),
[`@UsePipes()`](https://docs.nestjs.com/pipes) and
[`@UseFilters()`](https://docs.nestjs.com/exception-filters) all work as they do
in a controller. This page covers what is specific to NestWhats; for the
concepts themselves, the [NestJS documentation](https://docs.nestjs.com) is the
source.

## Guards

```typescript
@Command({ name: 'kick', description: 'Removes someone from the group' })
@UseGuards(GroupOnlyGuard, IsAdminGuard)
public async onKick(@Args() args: string) {}
```

| Guard | Allows the handler when |
|---|---|
| `GroupOnlyGuard` | The message came from a group |
| `DmOnlyGuard` | The message came from a direct chat |
| `FromMeGuard` | The message was sent by this account |
| `IsAdminGuard` | The sender is an admin of the group |
| `RequiresCapability(...)` | The client's adapter has every capability listed |

`GroupOnlyGuard` reads the chat id rather than fetching the chat, so it works on
platforms that cannot fetch one at all and costs no round trip on the ones that
can.

`IsAdminGuard` denies on a platform that cannot list participants, and says so
once in the log — that is not the same answer as "not an admin", and silence
would make the guard look broken.

A guard refusing is ordinary flow, not an error: the handler is skipped and
nothing reaches your logs as a failure.

## Writing one

```typescript title="src/business-hours.guard.ts" showLineNumbers
@Injectable()
export class BusinessHoursGuard implements NestWhatsGuard {
  public async canActivate(rawCtx: ExecutionContext): Promise<boolean> {
    const ctx = NestWhatsExecutionContext.create(rawCtx);
    const [client, message] = ctx.getContext<CommandContext>();
    const hour = new Date().getHours();
    return hour >= 9 && hour < 18;
  }
}
```

`NestWhatsExecutionContext.create()` is what turns Nest's generic context into
the `[client, message]` tuple.

## Pipes

`ParseArgs` fills a DTO from the positional arguments — see
[Commands](./commands.md). Any other [Nest pipe](https://docs.nestjs.com/pipes)
works the same way, including
[`ValidationPipe`](https://docs.nestjs.com/techniques/validation):

```typescript
@Command({ name: 'age', description: 'Checks an age' })
public async onAge(@Args(ParseIntPipe) age: number) {}
```

## Filters

`@UseFilters()` catches what a handler throws:

```typescript title="src/unsupported.filter.ts"
@Catch(CapabilityNotSupportedError)
export class UnsupportedFilter implements NestWhatsExceptionFilter {
  public async catch(err: CapabilityNotSupportedError, host: ArgumentsHost) {
    const [, message] = NestWhatsExecutionContext.create(host).getContext<CommandContext>();
    await message.reply(`this platform cannot ${err.capability}`);
  }
}
```
