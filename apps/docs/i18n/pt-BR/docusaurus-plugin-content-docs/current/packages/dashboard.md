---
sidebar_position: 1
title: Dashboard
description: Uma UI web para conexões, QR codes e clients criados em runtime.
---

# Dashboard

```bash npm2yarn
npm install @nestwhats/dashboard
```

```typescript
NestWhatsDashboardModule.forRoot({
  port: 4000,
  path: 'dashboard',
})
```

Abra `http://localhost:4000/dashboard`.

Ele sobe o próprio servidor HTTP, então funciona numa aplicação que não tem
servidor web nenhum — um bot iniciado com `createApplicationContext` basta.

## Opções

| Opção | Tipo | Padrão | O que faz |
|---|---|---|---|
| `port` | `number` | `4000` | Porta do servidor do dashboard |
| `path` | `string` | `'nestwhats'` | Caminho de URL em que ele é servido |
| `auth.username` | `string` | — | Basic auth, se você quiser |
| `auth.password` | `string` | — | |
| `webhook` | `boolean` | `false` | Mostra os controles de bind/unbind do `@nestwhats/webhook` |

:::caution
Não há autenticação por padrão, e o dashboard sabe criar e destruir clients.
Defina `auth` em qualquer coisa alcançável além do localhost.
:::

## O que ele mostra

Cada client é um card com o selo da plataforma, status da conexão, número de
telefone e prefixo, atualizando ao vivo — o registry empurra as mudanças em vez
de a página ficar perguntando.

- **QR code ou código de pareamento**, o que a plataforma usar, renderizado ali
- **Capacidades**, recolhidas, mostrando o que o adapter sabe e não sabe fazer
- **Prefixo**, editável, aplicado na próxima mensagem sem reconectar
- **Bindings de webhook**, quando o pacote de webhook está instalado

O selo da plataforma vem da factory, não da conexão, então já está certo na
primeira renderização — muito antes de o client subir.

## Criando clients

O formulário de criação monta os campos a partir do próprio adapter: cada
factory declara um `optionsSchema`, e o dashboard desenha um input rotulado por
opção — texto, número, checkbox, dropdown ou radio. Opções marcadas como
`advanced` se dobram em **More settings**, deixando na tela só o que decide como
um client conecta. Uma caixa "Advanced (JSON)" cobre o que o schema não cobre.

Com mais de uma factory registrada aparece um seletor, e os campos seguem a
escolha.

Os clients criados aqui são
[virtual clients](/docs/core/clients#virtual-clients). Configure `storage` no
`NestWhatsModule.forRoot` para eles sobreviverem a um restart.

## Editando

**Prefixo** aplica na hora. **Opções** não: elas foram fixadas quando o adapter
foi construído, então o client é derrubado e subido de novo — a conexão cai por
um instante e volta autenticada, porque as credenciais ficam sob o mesmo nome
de client.
