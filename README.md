<h1 align="center">
  <br>
  <img width="35" src="https://github.com/NedcloarBR/NestWhats/blob/master/assets/logo.png?raw=true"> NestWhats
  <br>
</h1>

<h3 align=center> A <b><a href="https://wwebjs.dev/">whatsapp-web.js</a></b> wrapper for <b><a href="https://nestjs.com">NestJS</a></b> to create <b><a href="https://www.whatsapp.com/">WhatsApp</a></b> bots</h3>

<p align="center">
  <a href="#❓ About">About</a>
  •
  <a href="⬇️ Installation">Installation</a>
  •
  <a href="⚙️ Usage">Usage</a>
  •
  <a href="📝 To-Do">To-Do</a>
  •
  <a href="#📖 License">License</a>
  •
  <a href="#🗞️ Credits">Credits</a>
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

Once the installation process is complete, we can import the `NestWhatsModule` into the root `AppModule`:

```TypeScript
import { NestWhatsModule } from 'nestwhats';
import { Module } from '@nestjs/common';
import { AppUpdate } from './app.update';

@Module({
  imports: [
    NestWhatsModule.forRoot({
      prefix: "!"
    })
  ],
  providers: [AppUpdate]
})
export class AppModule {}
```

Then create `app.update.ts` file and add `On`/`Once` decorators for handling whatsapp-web.js events:

```TypeScript
import { Injectable, Logger } from '@nestjs/common';
import { Context, On, Once, ContextOf } from 'nestwhats';
import { Client, Events } from 'whatsapp-web.js';

@Injectable()
export class AppUpdate {
  private readonly logger = new Logger(AppUpdate.name);
  public constructor(private readonly client: Client) {}
  
  @Once("ready")
  public onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`Bot logged in as ${client.info.pushname}`);
  }
  @On("message_create")
  public onWarn(@Context() [message]: ContextOf<'message_create'>) {
    this.logger.log(message);
  }
}
```

Whenever you need to handle any event data, use the `Context` decorator.

If you want to fully dive into NestWhats, check out these resources:

- [NestJS](https://nestjs.com) - A progressive framework for creating well-architectured applications.
- [whatsapp-web.js](https://wwebjs.dev/) - A WhatsApp client library for NodeJS that connects through the WhatsApp Web browser app

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
