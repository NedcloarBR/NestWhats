---
sidebar_position: 2
title: Webhook
description: Listeners que você liga e desliga em runtime, por client.
---

# Webhook

```bash npm2yarn
npm install @nestwhats/webhook
```

Este pacote é sobre **despacho de saída**: marcar listeners para que possam ser
ligados e desligados em runtime, por client, sem redeploy. Encaminhar o
resultado para algum lugar — um endpoint HTTP, uma fila, um CRM — é o que o seu
handler faz.

```typescript
NestWhatsWebhookModule.forRoot()   // persists bindings to .nestwhats/webhook-bindings.json
```

Sem o `forRoot` o módulo ainda funciona, mas os bindings se perdem no restart.

## Marcando um listener

```typescript title="src/webhook.handler.ts" showLineNumbers
@Injectable()
export class WebhookHandler {
  @On('messageUpsert')
  @Webhook()
  public async onMessage(@Context() [client, message]: ContextOf<'messageUpsert'>) {
    await this.http.post(this.url, { client: client.name, body: message.body });
  }
}
```

Handlers com `@Webhook()` são **excluídos do bind automático** — eles só
disparam depois de ligados, pelo `NestWhatsWebhookService` ou pelo dashboard.
Esse é o ponto: qual client encaminha qual evento vira decisão de runtime.

Se o adapter do client alvo não sabe emitir o evento, o bind é pulado com um
aviso em vez de nunca disparar em silêncio.

## Ligando

```typescript
await this.webhooks.bind('onMessage', { client: 'business' });
await this.webhooks.unbind('onMessage', { client: 'business' });

this.webhooks.getHandlers();                        // everything marked @Webhook()
this.webhooks.getBoundHandlers({ client: 'business' });
```

Defina `webhook: true` no módulo do dashboard e os mesmos controles aparecem no
card de cada client.

## O que fica guardado

Só os bindings — qual handler está ligado a qual client. Os clients em si
pertencem ao core; configure `storage` no `NestWhatsModule.forRoot` para
persistir esses.
