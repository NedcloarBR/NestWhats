# 08 · Localization

The bot answers in the language of whoever is writing, with nobody configuring
anything.

```bash
npm install && npm run build && npm start
```

## Try it

| Send | What happens |
|---|---|
| `!hello` from a `+55` number | Answered in Portuguese |
| `!hello` from a `+1` number | Answered in English |
| `!ddi` | The country code that decided it, and the locale that won |

`PhoneCountryResolver` reads the code off the sender's number, so nobody
configures anything.

## What to look at

`locales/` holds nested JSON, so `greeting.hello` maps to
`{ "greeting": { "hello": "…" } }`. Placeholders use `{{ name }}`.

`src/greeting.handler.ts` uses the three parameter decorators the package
adds:

| Decorator | Gives you |
|---|---|
| `@CurrentTranslate()` | The translation function for this message |
| `@CurrentLocale()` | The locale that won, or the fallback |
| `@DDI()` | The sender's country calling code, or `undefined` |

All three read one context resolved per message behind an `AsyncLocalStorage`,
which is why no locale has to be threaded through your own calls — a service
the handler delegates to sees the same answer.

> [!NOTE]
> `@DDI()` returning `undefined` is a normal answer, not a failure: a contact
> identified by a LID publishes no phone number, and a group has none behind
> it. WhatsApp is moving towards those ids, so plan for the number being
> unavailable.
