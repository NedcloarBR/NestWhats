---
sidebar_position: 3
title: Comandos
description: Prefixos, argumentos, aliases, grupos e subcomandos.
---

# Comandos

Um comando é um método de um provider. A palavra depois do prefixo é o que
dispara ele.

```typescript title="src/app.handler.ts"
@Injectable()
export class AppHandler {
  @Command({ name: 'ping', description: 'Answers with pong' })
  public async onPing(@Message() message: NestWhatsMessage) {
    await message.reply('pong');
  }
}
```

## Opções

| Campo | Tipo | O que faz |
|---|---|---|
| `name` | `string` | A palavra que dispara, depois do prefixo |
| `description` | `string` | Exibida por um comando de ajuda e no dashboard |
| `aliases` | `string[]` | Outras palavras que chegam no mesmo handler |
| `prefix` | `string` | Sobrescreve o prefixo do client só para este comando |
| `client` | `string \| string[]` | Restringe a um ou mais clients nomeados |

O `client` é como uma aplicação roda comandos diferentes por número:

```typescript
@Command({ name: 'invoice', description: 'Sends the invoice', client: 'business' })
```

## Argumentos

O `@Args()` entrega tudo que vem depois da palavra do comando, como uma string
só:

```typescript
@Command({ name: 'echo', description: 'Repeats what you said' })
public async onEcho(@Message() message: NestWhatsMessage, @Args() args: string) {
  await message.reply(args || 'you said nothing');
}
```

O `ArgIndex` recolhe argumentos posicionais em um DTO, e `rest: true` junta
tudo daquela posição em diante:

```typescript showLineNumbers
export class BanDto {
  @ArgIndex(0)
  public user!: string;

  @ArgIndex(1, { rest: true })
  public reason!: string;
}

@Command({ name: 'ban', description: 'Bans someone' })
public async onBan(@Arguments(ParseArgs) dto: BanDto) {
  // !ban 5511999998888 spamming the group
  //   dto.user   = '5511999998888'
  //   dto.reason = 'spamming the group'
}
```

O `ParseArgs` é o pipe que preenche o DTO. Tudo que um pipe do Nest sabe fazer
— validação, transformação — funciona aqui também.

## Grupos e subcomandos

Um grupo transforma uma palavra em namespace, alcançado como `!pai filho`:

```typescript title="src/config.handler.ts" showLineNumbers
@Injectable()
@CommandGroup({ name: 'config', description: 'Bot settings' })
export class ConfigHandler {
  @GroupDefault()
  public async onConfig() {
    // !config
  }

  @Subcommand({ name: 'prefix', description: 'Changes the prefix' })
  public async onPrefix(@Args() args: string) {
    // !config prefix .
  }

  @Subcommand({ name: 'locale', description: 'Changes the language' })
  public async onLocale(@Args() args: string) {
    // !config locale pt-BR
  }
}
```

O `@GroupDefault()` marca o método que roda quando o grupo é chamado sem
subcomando — `!config` sozinho.

## Decorators de parâmetro

| Decorator | Entrega |
|---|---|
| `@Message()` | O `NestWhatsMessage` que disparou |
| `@Args()` | Tudo depois da palavra do comando, como string |
| `@Arguments(ParseArgs)` | O DTO já parseado |
| `@Author()` | O id canônico de quem enviou |
| `@Chat()` | O id canônico do chat |
| `@Client()` | O `NestWhatsClient` em que a mensagem chegou |
| `@Context()` | A tupla `[client, message]` |

`@Msg()` é alias de `@Message()`, e `@Ctx()` de `@Context()`.

## Mudando o prefixo em runtime

O prefixo é lido a cada mensagem, não capturado quando o client sobe, então
mudá-lo vale já na mensagem seguinte:

```typescript
this.registry.updatePrefix('personal', '.');
```

O dashboard expõe isso como um campo editável.
