# 06 · Messaging

Sending from anywhere in the application, not only from a handler.

```bash
npm install && npm run build && npm start
```

## Try it

| Send | What happens |
|---|---|
| `!report` | Media, guarded by `AdapterCapability.SendMedia` (put a `report.pdf` next to the binary) |
| `!slow` | The typing indicator, then an answer three seconds later |
| `!quote` | A reply that quotes the original |

## What to look at

`src/notifier.service.ts` is the point of the example: it is an ordinary
provider with an injected client, so a cron job or an HTTP controller can send
without a message ever having arrived.

It also shows the two ways a platform difference surfaces — `supports()` before
the call, or catching `CapabilityNotSupportedError` after — and
`brazilianPhoneVariants`, for the ninth digit WhatsApp is inconsistent about.
