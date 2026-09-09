---
sidebar_position: 2
title: Clients
description: Vários números em um app, e clients criados em runtime.
---

# Clients

Um client é uma conexão: uma conta do WhatsApp, com a própria sessão e o
próprio prefixo. Uma aplicação pode rodar quantos quiser.

```typescript
NestWhatsModule.forRoot({
  adapters: [WhatsAppWebJsAdapterFactory],
  clients: [
    new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, { name: 'personal', prefix: '!' }),
    new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, { name: 'business', prefix: '/' }),
  ],
})
```

A factory deriva as credenciais de cada client do nome dele, então os dois
nunca dividem uma sessão.

## Usando um client específico

```typescript
@InjectClient('business') private readonly business: NestWhatsClient
```

Handlers podem ser restringidos com `client` no decorator, e o
`NestWhatsMessagingService` aceita `{ client: 'business' }` em toda chamada.

## Virtual clients

Um virtual client é criado com a aplicação rodando, em vez de declarado no
código. O botão "add client" do dashboard cria um, e o seu endpoint de admin
também pode.

```typescript
await this.manager.createClient({
  name: 'support',
  adapter: WhatsAppWebJsAdapterFactory,
  options: { pairWithPhoneNumber: { phoneNumber: '5511999998888' } },
});
```

Nomear a factory tipa as `options` do mesmo jeito que o
`NestWhatsClientConfig` faz.

:::info Eles não são injetáveis
Um client declarado ganha um token de DI porque o módulo sabe dele no boot. Um
virtual ainda não existe, então não há token a criar. Chegue neles pelo
`ClientsRegistryService` ou pelo `NestWhatsMessagingService`:

```typescript
const client = this.registry.getClient('support');
await this.messaging.sendMessage(chatId, 'hello', { client: 'support' });
```

É por isso que virtual clients servem bem para mensageria — enviar de uma conta
escolhida em runtime — enquanto clients declarados servem para bots, cujos
handlers são escritos de antemão.
:::

## Mantendo clients entre restarts

Passe `storage` e os virtual clients voltam no próximo boot:

```typescript
NestWhatsModule.forRoot({
  adapters: [WhatsAppWebJsAdapterFactory],
  storage: new JsonFileVirtualClientStorage(),   // .nestwhats/virtual-clients.json
})
```

O que fica guardado é a configuração necessária para recriar o client, não as
credenciais dele — essas pertencem à estratégia de autenticação do adapter.
Perder o arquivo significa que o client não é recriado; perder as credenciais
significa que ele é recriado e pede autenticação de novo.

Implemente `VirtualClientStorageAdapter` para guardá-los em outro lugar — um
banco, ou um store compartilhado quando várias instâncias precisam concordar
sobre quais clients existem. Clients declarados no código nunca são escritos
ali; eles vêm do módulo a cada boot.

## Alterando um client

```typescript
await this.manager.updateClient('support', { prefix: '.' });
```

Mudança de prefixo se aplica no lugar. Mudança de opções não: elas foram fixadas
quando a factory construiu o adapter, então o client é derrubado e subido de
novo, o que corta a conexão por um instante. As credenciais ficam sob o mesmo
nome de client, então ele volta autenticado em vez de pedir um QR code novo.

## Removendo um client

```typescript
await this.manager.destroyClient('support');
```

Só virtual clients podem ser destruídos — um declarado é gerido pelo ciclo de
vida da aplicação. Desligar o app não é deleção: virtual clients são derrubados
sem tocar no storage, então voltam no próximo boot.
