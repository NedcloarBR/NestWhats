# 10 · Baileys

A WebSocket connection with no browser, and the things a socket platform
reaches that a browser session cannot.

```bash
npm install && npm run build && npm start
```

## Try it

| Send | What happens |
|---|---|
| `!story good morning` | Posts to status — whatsapp-web.js has no API for this |
| `!watch 5511999998888@user` | Subscribes to presence; answers arrive as events |
| `!community Neighbourhood` | A capability this package registers itself |
| `!unread` | The chat list, direct conversations included |
| `!tidy` | Marks read, mutes for eight hours, archives |

## What to look at

`src/app.module.ts` turns on the three caches. They are not tuning: Baileys
keeps nothing between restarts and asks the application for what it needs
back, so the message cache is what stops a recipient sitting on *waiting for
this message*, and the group cache is what its own FAQ names as the way
accounts avoid being rate-limited when sending in groups.

`src/baileys.handler.ts` shows `@BaileysOn`, which types the platform's own
events. `call` needs it: the name collides with whatsapp-web.js', so it is
deliberately left out of the global augmentation.

> [!NOTE]
> The passkey flow is not shown here. Some accounts can only link a device by
> signing a WebAuthn challenge — give the factory a `passkey` signer, or answer
> the `passkeyChallenge` event. See the Baileys page in the documentation.
