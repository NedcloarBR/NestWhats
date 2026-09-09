<h1 align="center">
  <br>
  <img width="35" src="https://github.com/NedcloarBR/NestWhats/blob/master/assets/logo.png?raw=true"> NestWhats examples
  <br>
</h1>

<h3 align="center">Small, runnable applications — one per thing the framework does</h3>

<p align="center">
  <b><a href="https://nedcloarbr.github.io/nestwhats">Documentation</a></b>
  •
  <a href="https://nedcloarbr.github.io/nestwhats/docs/getting-started">Getting started</a>
  •
  <a href="https://github.com/NedcloarBR/nestwhats">Source code</a>
</p>

---

Each folder is a standalone NestJS application with its own `package.json`.
They are not part of the workspace, so install inside the one you want:

```bash
cd 01-getting-started
npm install
npm run build
npm start
```

| Example | What it shows |
|---|---|
| [01-getting-started](./01-getting-started) | A bot that answers `!ping`, from an empty project to a reply on your phone |
| [02-commands](./02-commands) | Arguments, aliases, per-command prefixes, DTOs, groups and subcommands |
| [03-guards-and-pipes](./03-guards-and-pipes) | The built-in guards, one of your own, a pipe and an exception filter |
| [04-listeners](./04-listeners) | The event vocabulary, the connection lifecycle and delivery status |
| [05-multiple-clients](./05-multiple-clients) | Two numbers on two platforms, in one application |
| [06-messaging](./06-messaging) | Sending from an ordinary provider — no handler involved |
| [07-dashboard](./07-dashboard) | The web UI, and clients created while the app runs |
| [08-localization](./08-localization) | Replies in the language of whoever is writing |
| [09-webhooks](./09-webhooks) | Listeners you bind and unbind at runtime, per client |
| [10-baileys](./10-baileys) | Status, presence, communities and polls — what a socket reaches |

Read them in order and each one adds a single idea to the one before. Reach for
a specific one and it stands alone.

> [!IMPORTANT]
> Every example drives a normal WhatsApp account, which is against WhatsApp's
> terms of service and can get the number banned without warning. Use a number
> you can afford to lose: a personal project, an internal tool, a prototype.
