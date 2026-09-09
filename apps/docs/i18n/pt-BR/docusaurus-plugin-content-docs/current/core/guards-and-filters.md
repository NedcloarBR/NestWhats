---
sidebar_position: 6
title: Guards, pipes e filters
description: Os do Nest que você já conhece, mais alguns nossos.
---

# Guards, pipes e filters

Handlers passam pelo pipeline de execução padrão do Nest, então
[`@UseGuards()`](https://docs.nestjs.com/guards),
[`@UsePipes()`](https://docs.nestjs.com/pipes) e
[`@UseFilters()`](https://docs.nestjs.com/exception-filters) funcionam como
funcionam num controller. Esta página cobre o que é específico do NestWhats;
para os conceitos em si, a [documentação do NestJS](https://docs.nestjs.com) é
a fonte.

## Guards

```typescript
@Command({ name: 'kick', description: 'Removes someone from the group' })
@UseGuards(GroupOnlyGuard, IsAdminGuard)
public async onKick(@Args() args: string) {}
```

| Guard | Libera o handler quando |
|---|---|
| `GroupOnlyGuard` | A mensagem veio de um grupo |
| `DmOnlyGuard` | A mensagem veio de uma conversa direta |
| `FromMeGuard` | A mensagem foi enviada por esta conta |
| `IsAdminGuard` | Quem enviou é admin do grupo |
| `RequiresCapability(...)` | O adapter do client tem todas as capacidades listadas |

O `GroupOnlyGuard` lê o id do chat em vez de buscar o chat, então funciona em
plataformas que nem sabem buscar um e não custa round trip nas que sabem.

O `IsAdminGuard` nega numa plataforma que não sabe listar participantes, e diz
isso uma vez no log — essa não é a mesma resposta que "não é admin", e o
silêncio faria o guard parecer quebrado.

Um guard negando é fluxo comum, não erro: o handler é pulado e nada chega aos
seus logs como falha.

## Escrevendo um

```typescript title="src/business-hours.guard.ts" showLineNumbers
@Injectable()
export class BusinessHoursGuard implements NestWhatsGuard {
  public async canActivate(rawCtx: ExecutionContext): Promise<boolean> {
    const ctx = NestWhatsExecutionContext.create(rawCtx);
    const [client, message] = ctx.getContext<CommandContext>();
    const hour = new Date().getHours();
    return hour >= 9 && hour < 18;
  }
}
```

O `NestWhatsExecutionContext.create()` é o que transforma o contexto genérico
do Nest na tupla `[client, message]`.

## Pipes

O `ParseArgs` preenche um DTO a partir dos argumentos posicionais — veja
[Comandos](/docs/core/commands). Qualquer outro
[pipe do Nest](https://docs.nestjs.com/pipes) funciona igual, incluindo o
[`ValidationPipe`](https://docs.nestjs.com/techniques/validation):

```typescript
@Command({ name: 'age', description: 'Checks an age' })
public async onAge(@Args(ParseIntPipe) age: number) {}
```

## Filters

O `@UseFilters()` pega o que um handler lança:

```typescript title="src/unsupported.filter.ts"
@Catch(CapabilityNotSupportedError)
export class UnsupportedFilter implements NestWhatsExceptionFilter {
  public async catch(err: CapabilityNotSupportedError, host: ArgumentsHost) {
    const [, message] = NestWhatsExecutionContext.create(host).getContext<CommandContext>();
    await message.reply(`this platform cannot ${err.capability}`);
  }
}
```
