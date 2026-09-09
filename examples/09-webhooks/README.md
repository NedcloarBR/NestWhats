# 09 · Webhooks

Listeners that can be attached and detached while the application runs, per
client, without a redeploy.

```bash
npm install && npm run build && npm start
```

## Try it

| Send | What happens |
|---|---|
| `!hooks` | Lists every `@Webhook()` handler and whether it is bound |
| `!bind onMessage` | From now on, messages are forwarded |
| `!unbind onMessage` | They stop, with the app still running |

Restart and the bindings come back: `JsonFileWebhookStorage` keeps them in
`.nestwhats/webhook-bindings.json`.

## What to look at

`src/forward.handler.ts` shows what `@Webhook()` changes. A plain `@On()`
listener binds automatically at boot; marking it excludes it from that, so it
fires only for the clients you bound it to.

The package is about the binding, not the delivery — the `fetch` in the
handler is ordinary code, and could just as well be a queue or a CRM call.
