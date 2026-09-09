---
sidebar_position: 1
title: Escolhendo uma plataforma
description: O que existe hoje, e o que cada jeito de chegar no WhatsApp custa.
---

# Escolhendo uma plataforma

O core é agnóstico de plataforma; um pacote de plataforma faz a conexão. Duas
existem.

| | whatsapp-web.js | Baileys |
|---|---|---|
| Como conecta | Navegador headless | WebSocket |
| Memória por sessão | ~1 GB | Megabytes |
| Listar conversas | Todos os chats | Conversas diretas e grupos |
| Estado do chat: arquivar, fixar, silenciar, ler | Não | Sim |
| Administração de grupo | Participantes, assunto, descrição, link de convite | Esses, mais foto, travar, aprovação de entrada e grupos vinculados |
| Status | Não | Sim |
| Presença, "visto por último" | Não | Sim |
| Comunidades, canais | Não | Sim |
| Entrar ou espiar um convite de grupo | Não | Sim |
| Recusar chamadas | Não | Sim |
| Configurações de privacidade | Não | Sim |
| Timer padrão de mensagens temporárias | Não | Sim |
| Vínculo por passkey | Não | Sim |
| Votos em enquete | Sim, como `voteUpdate` | Sim, como `pollVote` |

:::danger As duas automatizam uma conta pessoal
whatsapp-web.js e Baileys dirigem uma conta comum do WhatsApp. Isso fere os
termos de serviço, e o número pode ser banido sem aviso nem recurso.

O caminho autorizado para uma empresa é a Cloud API oficial da Meta, e o
**NestWhats não tem adapter para ela hoje**. Se você precisa de um, esta
biblioteca ainda não é a ferramenta certa — use o SDK da Meta direto, ou uma
das plataformas construídas em cima dele.

Use o NestWhats num número que você pode perder: um projeto pessoal, uma
ferramenta interna, um protótipo.
:::

## Como escolher

**Protótipo, ou um número pessoal.** whatsapp-web.js. Ele suporta o conjunto
mais amplo de recursos por ser o cliente web de verdade, e um gigabyte de RAM
não faz diferença para uma sessão só.

**Muitos números, ou um servidor pequeno.** Baileys. Sem navegador as sessões
custam megabytes em vez de gigabytes, e ele faz bastante coisa que o cliente
web não faz: postar status, acompanhar presença, comunidades e canais, recusar
chamadas e ler as configurações de privacidade da conta.

A lista de chats dele é mantida pelo adapter, não pela biblioteca, o que tem
uma consequência que vale saber: um client recém-vinculado sabe pouco até o
WhatsApp mandar alguma coisa. O `syncFullHistory` decide quanto chega nesse
primeiro vínculo, e `chatStore: false` desliga tudo, deixando o `getChats()` só
com grupos.

## Trocando de plataforma

Seus handlers não mudam. O que muda é o que a plataforma sabe fazer, e o
sistema de capacidades é como isso aparece:

```typescript
if (client.supports(AdapterCapability.ListChats)) {
  const chats = await client.getChats();
}
```

Escreva contra o contrato, confira capacidades onde importa, e recorra ao `raw`
só onde você aceita ficar amarrado a uma plataforma. Aí a troca é uma mudança
no `forRoot` e nada mais.

## Escrevendo a sua

O contrato é pequeno de propósito — pequeno o bastante para uma plataforma sem
sessão nenhuma satisfazê-lo, que é o que mantém a porta aberta para um adapter
de API oficial depois. Veja
[Escrevendo um adapter](/docs/platforms/writing-an-adapter).
