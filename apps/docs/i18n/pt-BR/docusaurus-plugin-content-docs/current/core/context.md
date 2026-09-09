---
sidebar_position: 5
title: Contexto e injeção
description: Chegando no client, na mensagem e na plataforma por baixo.
---

# Contexto e injeção

## Dentro de um handler

O `@Context()` entrega a tupla; os outros decorators tiram uma coisa dela.

```typescript showLineNumbers
@Command({ name: 'whoami', description: 'Tells you who you are' })
public async onWhoAmI(
  @Context() [client, message]: CommandContext,
  @Author() authorId: string,
  @Chat() chatId: string,
) {
  await message.reply(`you are ${authorId} in ${chatId}, via ${client.name}`);
}
```

## Injetando um client

O `@InjectClient(nome)` fornece um `NestWhatsClient` em qualquer lugar da
aplicação, pela [injeção de dependência](https://docs.nestjs.com/providers)
comum do Nest. Nomeie o tipo de opções do adapter para ler `options` sem cast:

```typescript title="src/notifier.service.ts" showLineNumbers
@Injectable()
export class NotifierService {
  public constructor(
    @InjectClient('personal')
    private readonly client: NestWhatsClient<WhatsAppWebJsAdapterOptions>,
  ) {}

  public async notify(chatId: string, text: string) {
    await this.client.sendMessage(chatId, text);
  }
}
```

Injetar um nome que client nenhum declara falha no boot com uma mensagem
nomeando os clients que existem, em vez de te entregar `undefined`.

## O que um client carrega

| Membro | O que é |
|---|---|
| `name` | Como ele é nomeado e injetado |
| `options` | Com o que foi configurado — as dele, mescladas sobre as da factory |
| `platform` | Qual plataforma está por trás, sabida antes de conectar |
| `adapterId` | Id da factory que construiu o adapter |
| `adapter` | O adapter em si |
| `raw` | O objeto de client da própria plataforma, intocado |

Mais os métodos de envio, consulta e assinatura — veja
[Mensageria](/docs/core/messaging).

## Usando a plataforma direto

O `raw` é a saída de emergência, totalmente tipada, para o que o contrato não
cobre:

```typescript
const native = this.client.raw as Client;  // whatsapp-web.js Client
await native.getWWebVersion();
```

Recorrer ao `raw` amarra aquele código a uma plataforma. Ele está sempre
disponível, e isso é proposital — um contrato que cobrisse tudo seria enorme ou
impediria as plataformas de fazerem o que as torna diferentes.

## Lendo o estado de todos os clients

O `ClientsRegistryService` é o estado ao vivo de cada client, atualizado no
instante em que um adapter reporta mudança:

```typescript
const summary = this.registry.getSummary();
// [{ name, status, statusAt, platform, capabilities, qr?, info?, … }]

this.registry.subscribe(() => this.refresh());
```

É o que o dashboard lê, e é assim que você constrói o seu.
