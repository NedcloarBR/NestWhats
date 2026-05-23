<h1 align="center">
  <br>
  <img width="35" src="https://github.com/NedcloarBR/NestWhats/blob/master/assets/logo.png?raw=true"> NestWhats
  <br>
</h1>

<h3 align=center> A <b><a href="https://wwebjs.dev/">whatsapp-web.js</a></b> wrapper for <b><a href="https://nestjs.com">NestJS</a></b> to create <b><a href="https://www.whatsapp.com/">WhatsApp</a></b> bots</h3>

<p align="center">
  <a href="#-about">About</a>
  •
  <a href="#-installation">Installation</a>
  •
  <a href="#-usage">Usage</a>
  •
  <a href="#-multiple-clients">Multiple Clients</a>
  •
  <a href="#-commands">Commands</a>
  •
  <a href="#-to-do">To-Do</a>
  •
  <a href="#-license">License</a>
  •
  <a href="#️-credits">Credits</a>
</p>

## ❓ About

NestWhats is a module for NestJS that abstracts methods from whatsapp-web.js to facilitate the creation of bots for WhatsApp. \
whatsapp-web.js is a WhatsApp API client that connects through WhatsApp Web browser app using Puppeteer

> [!IMPORTANT]
> **It is not guaranteed you will not be blocked by using this method. WhatsApp does not allow bots or unofficial clients on their platform, so this shouldn't be considered totally safe.**

## ⬇️ Installation

> [!NOTE]
> NodeJS `v20+` is required

```bash
$ npm i nestwhats whatsapp-web.js
$ yarn add nestwhats whatsapp-web.js
$ pnpm add nestwhats whatsapp-web.js
```

## ⚙️ Usage

### Single client

Import `NestWhatsModule` into the root `AppModule`:

```typescript
import { NestWhatsModule } from 'nestwhats';
import { Module } from '@nestjs/common';
import { AppUpdate } from './app.update';

@Module({
  imports: [
    NestWhatsModule.forRoot({
      prefix: '!'
    })
  ],
  providers: [AppUpdate]
})
export class AppModule {}
```

Use `@On`/`@Once` decorators to handle whatsapp-web.js events, and inject the `Client` directly:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Context, On, Once, ContextOf } from 'nestwhats';
import { Client } from 'whatsapp-web.js';

@Injectable()
export class AppUpdate {
  private readonly logger = new Logger(AppUpdate.name);

  public constructor(private readonly client: Client) {}

  @Once('ready')
  public onReady() {
    this.logger.log(`Bot logged in as ${this.client.info.pushname}`);
  }

  @On('message_create')
  public onMessage(@Context() [message]: ContextOf<'message_create'>) {
    this.logger.log(message);
  }
}
```

### Event options

Both `@On` and `@Once` accept an optional second argument to filter which clients trigger the listener.

| Option   | Type                   | Description                                              |
|----------|------------------------|----------------------------------------------------------|
| `client` | `string \| string[]`   | Client name(s) that should trigger this listener. When omitted, all clients trigger it. |

### Async configuration

```typescript
NestWhatsModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    prefix: config.get('BOT_PREFIX'),
  }),
  inject: [ConfigService],
})
```

## 👥 Multiple Clients

Register each client independently with its own `forRoot` call. NestJS deduplicates shared infrastructure automatically.

```typescript
import { NestWhatsModule } from 'nestwhats';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    NestWhatsModule.forRoot({ name: 'PERSONAL', prefix: '!' }),
    NestWhatsModule.forRoot({ name: 'BUSINESS', prefix: '/' }),
  ],
})
export class AppModule {}
```

Inject a specific client using `@InjectClient(name)`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectClient } from 'nestwhats';
import { Client } from 'whatsapp-web.js';

@Injectable()
export class MyService {
  public constructor(
    @InjectClient('PERSONAL') private readonly personal: Client,
    @InjectClient('BUSINESS') private readonly business: Client,
  ) {}

  public async sendFromBusiness(chatId: string, text: string) {
    await this.business.sendMessage(chatId, text);
  }
}
```

For async registration of a named client, pass `name` as a static option:

```typescript
NestWhatsModule.forRootAsync({
  name: 'BUSINESS',
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    prefix: config.get('BUSINESS_PREFIX'),
  }),
  inject: [ConfigService],
})
```

> [!NOTE]
> When registering a single unnamed client, `name` defaults to `'default'` and the `Client` token remains available for injection without `@InjectClient`, preserving backward compatibility.

### Filtering events by client

When using multiple clients, listeners fire on all of them by default. Use the `client` option to restrict a listener to one or more specific clients:

```typescript
import { Injectable } from '@nestjs/common';
import { On, Once, Context, ContextOf } from 'nestwhats';

@Injectable()
export class AppUpdate {
  // fires on every client
  @On('message_create')
  public onAnyMessage(@Context() [message]: ContextOf<'message_create'>) {}

  // fires only on PERSONAL
  @On('message_create', { client: 'PERSONAL' })
  public onPersonalMessage(@Context() [message]: ContextOf<'message_create'>) {}

  // fires on PERSONAL and BUSINESS, but not a third client
  @On('message_create', { client: ['PERSONAL', 'BUSINESS'] })
  public onTwoClients(@Context() [message]: ContextOf<'message_create'>) {}

  // once listener scoped to a single client
  @Once('ready', { client: 'BUSINESS' })
  public onBusinessReady() {}
}
```

## 📜 Commands

Register a command handler with the `@Command` decorator. The global `prefix` defined in `forRoot` applies to all commands by default.

```typescript
import { Injectable } from '@nestjs/common';
import { Command, Message, Author } from 'nestwhats';
import { Message as WWebMessage } from 'whatsapp-web.js';

@Injectable()
export class BotUpdate {
  @Command({ name: 'ping', description: 'Replies with pong' })
  public async ping(@Message() message: WWebMessage) {
    await message.reply('pong!');
  }

  @Command({ name: 'hello', description: 'Greets the author', aliases: ['hi', 'hey'] })
  public async hello(@Author() author: string) {
    console.log(`Hello, ${author}!`);
  }
}
```

### Per-command prefix

Override the global prefix for a specific command using the `prefix` option:

```typescript
@Command({ name: 'start', description: 'Start command', prefix: '/' })
public async start(@Message() message: WWebMessage) {
  // responds to "/start" regardless of the global prefix
  await message.reply('Starting...');
}
```

### Command options

| Option        | Type       | Description                                        |
|---------------|------------|----------------------------------------------------|
| `name`        | `string`   | The command name (matched after the prefix)        |
| `description` | `string`   | A short description of the command                 |
| `aliases`     | `string[]` | Additional names that trigger the same command     |
| `prefix`      | `string`   | Overrides the global prefix for this command only  |

## 📝 To-Do

- [ ] Docs
  - [ ] GH Pages or Wiki
  - [ ] JSDoc in code
- [ ] New Providers

## 📖 License

[GPL-3.0 License](https://github.com/NedcloarBR/NestWhats/blob/master/License)

## 🗞️ Credits

- This project is inspired in [Necord](https://necord.org/) - 🤖 A module for creating Discord bots using NestJS, based on Discord.js
  > NestWhats is an adaptation of Necord to work with whatsapp-web.js \
  > I NedcloarBR am a contributor to Necord

- Want to see your name on this list? - see the [Contribution](https://github.com/NedcloarBR/NestWhats/blob/master/.github/CONTRIBUTING.md) page.
