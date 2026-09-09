# 04 · Listeners

The event vocabulary, and the difference between what an adapter reports and
what the core derives from it.

```bash
npm install && npm run build && npm start
```

## The five derived events

`qr`, `pairingCode`, `authenticated`, `ready` and `disconnected` are worked out
by the core from the adapter's raw `connectionUpdate`. An adapter reports
state; the core decides what it means — which is why a status event fires only
on a real transition, and why `@Once('ready')` works even though platforms
repeat their state on every reconnect.

## What to look at

| File | Why |
|---|---|
| `src/connection.listener.ts` | `isTerminalDisconnect` separates "needs a new QR" from "the network blinked" |
| `src/message.listener.ts` | `messageStatus`, and scoping a listener with `{ client: 'personal' }` |
| `src/app.module.ts` | `disconnectDebounceMs` and `reconnect`, which decide what a flap looks like |

Pull the network for a few seconds with `disconnectDebounceMs` set and nothing
reaches your handlers. Remove it and the same flap gives you a
`disconnected`/`ready` pair for something that never really went away.
