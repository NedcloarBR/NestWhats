# 07 · Dashboard

The web UI for connections and QR codes, and clients created while the
application is running.

```bash
npm install && npm run build && npm start
```

Open `http://localhost:4000/nestwhats` — user `admin`, password `change-me`.

## What you see

Each client is a card with its platform badge, status, phone number and
prefix, updating live: the registry pushes changes rather than the page
polling. The QR renders inline, capabilities are listed, and the prefix is
editable.

The create form builds its fields from the adapter itself — each factory
declares an `optionsSchema` and the dashboard renders one labelled input per
option, folding the advanced ones away.

## Try it

| Send | What happens |
|---|---|
| `!clients` | The same state the dashboard reads |
| `!add support` | A virtual client; its QR appears in the dashboard |
| `!prefix .` | Applies on the next message, no reconnect |
| `!drop support` | Only virtual clients can be destroyed |

Restart the app and `support` comes back, because `storage` was configured.
Shutting down is not deletion.

> [!CAUTION]
> The dashboard has no authentication by default and can create and destroy
> clients. `auth` is set here for that reason.
