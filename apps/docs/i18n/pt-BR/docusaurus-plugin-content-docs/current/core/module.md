---
sidebar_position: 1
title: O módulo
description: forRoot, forRootAsync, factories de adapter e configurações do módulo.
---

# O módulo

`NestWhatsModule.forRoot()` é o ponto de entrada. Ele recebe **factories** em
`adapters` e os **clients** que devem subir.

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

## Factories, não adapters

Uma factory guarda a configuração que os clients de uma plataforma
compartilham; o `create()` dela constrói um adapter — uma conexão — por client.
Manter os dois separados é o que permite cada client ter as próprias
credenciais e o próprio diretório de sessão sem você ligar isso na mão.

O `adapters` também aceita a classe sozinha, o que a constrói com os padrões
dela:

```typescript
adapters: [WhatsAppWebJsAdapterFactory]
```

Nomear a classe no `NestWhatsClientConfig` é o que tipa as `options` daquele
client contra a factory que vai recebê-las, então um typo quebra o build:

```typescript
new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, {
  name: 'business',
  options: { pairWithPhoneNumber: { phoneNumber: '5511999998888' } },
  //         ^ conferido contra as opções do próprio adapter
})
```

Um client que não passa opções pode ser um objeto simples, e pode nem nomear o
adapter quando só um está registrado:

```typescript
clients: [{ name: 'personal', prefix: '!' }]
```

## Várias plataformas ao mesmo tempo

Registre mais de uma factory e cada client diz em qual roda — por classe, por
instância ou por id:

```typescript
NestWhatsModule.forRoot({
  adapters: [WhatsAppWebJsAdapterFactory, BaileysAdapterFactory],
  clients: [
    new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, { name: 'personal' }),
    new NestWhatsClientConfig(BaileysAdapterFactory, { name: 'business' }),
  ],
})
```

Registre a mesma plataforma duas vezes com configurações diferentes dando um
`id` próprio à segunda factory.

## Configurações do módulo

| Opção | O que faz |
|---|---|
| `ignoreSelf` | Descarta as mensagens que o próprio client enviou em vez de tratá-las |
| `disconnectDebounceMs` | Segura o anúncio de `disconnected`; uma reconexão dentro da janela cancela |
| `reconnect` | Reconecta depois de uma queda, com backoff por motivo. Desligado por padrão |
| `storage` | Onde os virtual clients ficam guardados para sobreviver a um restart |

O `disconnectDebounceMs` se paga em plataformas que se recuperam sozinhas — o
Baileys cai e reconecta em segundos, e sem ele cada oscilação entrega aos seus
handlers um par `disconnected`/`ready` de algo que nunca saiu do ar de verdade.
Uns `30000` fazem sentido ali; `0` (o padrão) anuncia na hora. Um logout ou uma
falha de autenticação sempre anunciam na hora, já que reconexão nenhuma vem.

O `reconnect` vem desligado de propósito: uma plataforma que tenta de novo por
conta própria deve continuar sendo dona disso, e ligar aqui correria contra as
tentativas dela. Passe `{}` para os padrões.

## Configuração assíncrona

O `forRootAsync` aceita as três formas padrão do NestJS — `useFactory`,
`useClass` e `useExisting` — construídas sobre o
[configurable module builder](https://docs.nestjs.com/fundamentals/dynamic-modules#configurable-module-builder)
do Nest:

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

Com `useClass`, a classe de configuração implementa `NestWhatsOptionsFactory` e
o módulo a instancia para você:

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

:::caution `clientNames` é obrigatório em clients assíncronos
Os tokens de injeção precisam existir antes de a factory ter rodado, então um
client que não se chama `default` tem que ser nomeado antes:

```typescript
NestWhatsModule.forRootAsync({
  clientNames: ['personal', 'business'],
  useFactory: () => ({ /* … */ }),
})
```

Derivar os nomes do `@InjectClient` foi tentado e revertido: aquele registro é
do processo inteiro, então um segundo módulo na mesma aplicação puxaria em
silêncio os nomes do primeiro.
:::

## O módulo é global

O `forRoot` registra globalmente, então `NestWhatsMessagingService`,
`ClientsRegistryService` e todo token de `@InjectClient` ficam disponíveis em
qualquer lugar sem importar o módulo de novo.
