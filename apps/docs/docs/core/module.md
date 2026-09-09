---
sidebar_position: 1
title: The module
description: forRoot, forRootAsync, adapter factories and module-wide settings.
---

# The module

`NestWhatsModule.forRoot()` is the entry point. It takes **factories** in
`adapters` and the **clients** to start.

```typescript title="src/app.module.ts" showLineNumbers
NestWhatsModule.forRoot({
  adapters: [
    new WhatsAppWebJsAdapterFactory({ authStrategy: new LocalAuth() }),
  ],
  clients: [
    new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, { name: 'personal' }),
  ],
})
```

## Factories, not adapters

A factory holds the configuration a platform's clients share; its `create()`
builds one adapter — one connection — per client. Keeping the two apart is what
lets each client get its own credentials and session directory without you
wiring that yourself.

`adapters` also takes the class on its own, which builds it with its defaults:

```typescript
adapters: [WhatsAppWebJsAdapterFactory]
```

Naming the class in `NestWhatsClientConfig` is what types that client's
`options` against the factory that will receive them, so a typo fails the build:

```typescript
new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, {
  name: 'business',
  options: { pairWithPhoneNumber: { phoneNumber: '5511999998888' } },
  //         ^ checked against the adapter's own options
})
```

A client that passes no options can be a plain object, and can skip naming its
adapter entirely when only one is registered:

```typescript
clients: [{ name: 'personal', prefix: '!' }]
```

## Several platforms at once

Register more than one factory and each client names which it runs on — by
class, by instance, or by id:

```typescript
NestWhatsModule.forRoot({
  adapters: [WhatsAppWebJsAdapterFactory, BaileysAdapterFactory],
  clients: [
    new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, { name: 'personal' }),
    new NestWhatsClientConfig(BaileysAdapterFactory, { name: 'business' }),
  ],
})
```

Register the same platform twice with different configuration by giving the
second factory its own `id`.

## Module-wide settings

| Option | What it does |
|---|---|
| `ignoreSelf` | Drop messages the client itself sent instead of handling them |
| `disconnectDebounceMs` | Hold a `disconnected` announcement; a reconnect inside the window cancels it |
| `reconnect` | Reconnect after a drop, backing off by reason. Off by default |
| `storage` | Where virtual clients are kept so they survive a restart |

`disconnectDebounceMs` earns its keep on platforms that recover on their own —
Baileys drops and reconnects within seconds, and without it every flap gives
your handlers a `disconnected`/`ready` pair for something that never really went
away. Around `30000` is sensible there, `0` (the default) announces immediately.
A logout or an auth failure always announces immediately, since no reconnect is
coming.

`reconnect` is off by default on purpose: a platform that retries internally
should keep owning it, and turning this on would race its own attempts. Pass
`{}` for the defaults.

## Async configuration

`forRootAsync` takes the three standard NestJS forms — `useFactory`, `useClass`
and `useExisting` — built on Nest's
[configurable module builder](https://docs.nestjs.com/fundamentals/dynamic-modules#configurable-module-builder):

```typescript showLineNumbers
NestWhatsModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    adapter: new WhatsAppWebJsAdapterFactory({
      authStrategy: new LocalAuth({ clientId: config.get('CLIENT_ID') }),
    }),
  }),
  inject: [ConfigService],
})
```

With `useClass`, the configuration class implements `NestWhatsOptionsFactory`
and the module instantiates it for you:

```typescript showLineNumbers
@Injectable()
export class NestWhatsConfig implements NestWhatsOptionsFactory {
  public constructor(private readonly config: ConfigService) {}

  public createNestWhatsOptions(): NestWhatsModuleOptions {
    return { adapter: new WhatsAppWebJsAdapterFactory({ /* … */ }) };
  }
}

NestWhatsModule.forRootAsync({ imports: [ConfigModule], useClass: NestWhatsConfig });
```

:::caution `clientNames` is required for async clients
The injection tokens have to exist before the factory has run, so a client that
is not called `default` must be named up front:

```typescript
NestWhatsModule.forRootAsync({
  clientNames: ['personal', 'business'],
  useFactory: () => ({ /* … */ }),
})
```

Deriving the names from `@InjectClient` was tried and backed out: that registry
is process-wide, so a second module in the same application would silently pull
in the first one's names.
:::

## The module is global

`forRoot` registers globally, so `NestWhatsMessagingService`,
`ClientsRegistryService` and every `@InjectClient` token are available anywhere
without importing the module again.
