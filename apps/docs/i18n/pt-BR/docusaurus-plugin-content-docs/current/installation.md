---
sidebar_position: 2
title: Instalação
description: Os pacotes que você precisa, e o que eles exigem.
---

# Instalação

O NestWhats precisa do core mais um pacote de plataforma. O core sozinho não
conecta em lugar nenhum.

```bash npm2yarn
npm install nestwhats @nestwhats/platform-whatsapp-web.js
```

Todo pacote é peer do [NestJS](https://docs.nestjs.com) 12 e espera
`reflect-metadata` e `rxjs`, que uma aplicação Nest já tem.

## Requisitos

| | Versão |
|---|---|
| Node.js | **≥ 20.19.0** |
| NestJS | **12** |
| TypeScript | **≥ 5.9**, 6.x recomendado |

## Pacotes opcionais

Cada um é independente, e cada página tem a própria configuração.

| Pacote | O que faz |
|---|---|
| [Dashboard](/docs/packages/dashboard) | Uma UI web para conexões, QR codes e clients criados em runtime |
| [Webhook](/docs/packages/webhook) | Listeners que você liga e desliga em runtime, por client |
| [Locale](/docs/packages/locale) | Respostas no idioma de quem está escrevendo |

## Escolhendo uma plataforma

O core não conecta sozinho. Veja
[Escolhendo uma plataforma](/docs/platforms/overview) para o que cada uma sabe
fazer, e [whatsapp-web.js](/docs/platforms/whatsapp-web-js) para a que já está
publicada.
