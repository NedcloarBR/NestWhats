# 01 · Getting started

A bot that answers `!ping`, on a real WhatsApp Web session driven by
whatsapp-web.js. You scan a QR code with your phone.

```bash
npm install
npm run build
npm start
```

The QR is printed in the terminal. Scan it, then send `!ping` to the connected
number from another phone.

## What to look at

| File | Why |
|---|---|
| `src/app.module.ts` | The factory in `adapters`, the connection in `clients` |
| `src/app.handler.ts` | A command and two lifecycle listeners, on one ordinary provider |
| `src/main.ts` | `enableShutdownHooks()`, which is what closes the browser cleanly |

> [!IMPORTANT]
> This drives a normal WhatsApp account, which is against WhatsApp's terms of
> service. Use a number you can afford to lose.
