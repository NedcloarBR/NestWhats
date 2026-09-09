---
sidebar_position: 8
title: Capacidades
description: O que muda quando você troca de plataforma, e como perguntar.
---

# Capacidades

Plataformas diferem no que sabem fazer. Uma sessão de navegador administra
grupos mas não posta status; uma plataforma de socket faz as duas. Uma
capacidade é como você pergunta antes de chamar.

## Conferindo o que um client suporta

Use o `supports()` para perguntar, e o método para agir:

```typescript
if (client.supports(AdapterCapability.PostStatus)) {
  await client.postStatus('good morning');
}
```

Chamar uma que a plataforma não tem rejeita com `CapabilityNotSupportedError`,
que carrega a capacidade como campo para você ramificar nela:

```typescript showLineNumbers
try {
  await client.postStatus('good morning');
} catch (err) {
  if (err instanceof CapabilityNotSupportedError) {
    this.logger.warn(`${err.platform} cannot ${err.capability}`);
    return;
  }
  throw err;   // a real failure on the wire
}
```

Ela estende `NestWhatsError`, que é o que todo erro levantado pelo próprio
NestWhats faz. Capturar essa separa "o NestWhats recusou" de "a plataforma
falhou".

## Pulando um handler na plataforma errada

O `RequiresCapability` pula um handler num client que não sabe fazer o que ele
precisa:

```typescript
@Command({ name: 'story', description: 'Posts a status' })
@UseGuards(RequiresCapability(AdapterCapability.PostStatus))
public async onStory(@Message() message: NestWhatsMessage) {
  // reached only where postStatus exists
}
```

Ele aceita várias e exige todas.

## As capacidades embutidas

| Capacidade | Método do adapter | O que cobre |
|---|---|---|
| `sendMedia` | `sendMedia` | Anexos, não só texto |
| `presence` | `sendPresence` | Indicadores de digitando e gravando |
| `readReceipts` | `sendSeen` | Marcar um chat como lido |
| `revoke` | `revokeMessage` | Apagar para todos |
| `listChats` | `getChats` | Listar conversas |
| `readChat` | `getChat` | Buscar uma conversa |
| `readContact` | `getContact` | Buscar um contato |
| `logout` | `logout` | Descartar as credenciais |
| `createGroup` | `createGroup` | Criar um grupo |
| `readAbout` | `getAbout` | Ler o recado de alguém |
| `setAbout` | `setAbout` | Mudar o próprio recado |
| `setProfileName` | `setProfileName` | Mudar o nome de exibição |
| `setProfilePicture` | `setProfilePicture` | Mudar a foto |
| `block` | `setBlocked` | Bloquear e desbloquear |
| `postStatus` | `postStatus` | Publicar no status |
| `subscribePresence` | `subscribePresence` | Ser avisado quando um contato entra e sai |

`AdapterCapability` é ao mesmo tempo o tipo união e um objeto com esses nomes,
então `AdapterCapability.SendMedia` e `'sendMedia'` são o mesmo valor.

## Adicionando a sua própria capacidade

Aquela tabela é a do core; não é a lista inteira. Um pacote de plataforma
adiciona as capacidades dele do mesmo jeito que adiciona eventos:

```typescript
declare module 'nestwhats' {
  interface AdapterCapabilities {
    template: 'sendTemplate';
  }
}

registerCapability('template', 'sendTemplate');
```

A augmentation é o lado de tipos e some no build; o `registerCapability` é o
lado de runtime, chamado no carregamento do módulo. Depois disso o
`client.supports('template')` é conferido em tempo de compilação e derivado em
runtime exatamente como uma embutida.

Enumere com `getKnownCapabilities()`, que inclui o que os pacotes de plataforma
carregados registraram.

## Desligando uma capacidade

Às vezes implementar um método não é a mesma coisa que poder usá-lo: a mesma
classe de adapter pode fazer menos para uma conta do que para outra. O
`unsupported` tira capacidades:

```typescript
export class MetaCloudAdapter implements NestWhatsAdapter<MetaClient> {
  public readonly unsupported = new Set([AdapterCapability.ListChats]);
}
```

Ele só subtrai. Não existe jeito de reivindicar uma capacidade sem implementá-la,
e uma capacidade acrescentada ao core depois continua sendo derivada para todo
adapter em vez de ser reportada como ausente em silêncio.

## Recursos de uma mensagem ou de um chat

Se uma mensagem pode ser editada, ou se um grupo sabe listar participantes, não
é capacidade. Pergunte ao próprio membro:

```typescript
if (message.edit) await message.edit('corrected');
if (chat.addParticipants) await chat.addParticipants([id]);
```

Isso é mais preciso que uma flag por adapter: `chat.addParticipants` está
ausente numa conversa direta mesmo onde a plataforma tem grupos.
