# 05 · Several numbers

One application, two connected numbers, on two different platforms.

```bash
npm install && npm run build && npm start
```

The whatsapp-web.js client shows a QR; the Baileys one shows its own. Each
keeps a separate session, because the factory derives credentials from the
client's name.

## Try it

| Send | Where |
|---|---|
| `!ping` | The `support` number |
| `/ping` | The `alerts` number, which has its own prefix |
| `!hours` | Only `support` — the command names it |

## What to look at

`src/app.module.ts` declares two factories and one client per number. Naming
the factory class in `NestWhatsClientConfig` is what types that client's
`options` against the factory that receives them, so a typo fails the build.

`src/routing.handler.ts` shows the two ways to send: `@InjectClient('alerts')`
when you know which number, and `NestWhatsMessagingService` with
`{ client }` when it is decided at runtime.
