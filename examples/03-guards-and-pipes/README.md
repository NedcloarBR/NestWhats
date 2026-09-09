# 03 · Guards, pipes and filters

Handlers run through the standard Nest execution pipeline, so `@UseGuards()`,
`@UsePipes()` and `@UseFilters()` work as they do in a controller.

```bash
npm install && npm run build && npm start
```

## Try it

| Send | What happens |
|---|---|
| `!kick 5511999998888` in a group, as an admin | Both guards pass |
| `!kick …` in a direct chat | `GroupOnlyGuard` skips the handler, silently |
| `!secret` in a direct chat | `DmOnlyGuard`, the other way round |
| `!story good morning` on whatsapp-web.js | Skipped: that platform has no `postStatus` |
| `!open` outside 9–18 | A guard of your own |
| `!age twelve` | `ParseIntPipe` refuses it |

## What to look at

`src/business-hours.guard.ts` shows the one NestWhats-specific line:
`NestWhatsExecutionContext.create()` turns Nest's generic context into the
`[client, message]` tuple. Everything else is a plain Nest guard.

`src/unsupported.filter.ts` catches `CapabilityNotSupportedError` and answers
in the chat, so a platform difference reads as a reply rather than a crash.
