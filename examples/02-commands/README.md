# 02 · Commands

Everything a command can take: raw arguments, aliases, a per-command prefix,
parameter decorators, a DTO filled by a pipe, and a subcommand group.

```bash
npm install && npm run build && npm start
```

## Try it

| Send | What answers |
|---|---|
| `!echo hello` or `!say hello` | The alias reaches the same handler |
| `.version` | A command with its own prefix |
| `!whoami` | `@Author()` and `@Chat()` |
| `!ban 5511999998888 spamming the group` | `ParseArgs` fills `BanDto`, reason and all |
| `!config` | The group's default |
| `!config prefix .` | A subcommand |

## What to look at

`src/ban.dto.ts` is where `@ArgIndex(1, { rest: true })` earns its keep: without
`rest`, a reason with spaces would arrive as one word.
