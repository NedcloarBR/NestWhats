---
sidebar_position: 2
title: Ciclo de vida da conexão
description: Status, motivos de queda, debounce e reconexão.
---

# Ciclo de vida da conexão

Um adapter reporta estado; o core decide o que aquilo significa.

## Status

```typescript showLineNumbers
enum ClientStatus {
  Initializing,
  QrReceived,           // waiting for a scan
  PairingCodeReceived,  // waiting for a code on the phone
  Authenticated,        // credentials accepted, not usable yet
  Ready,                // connected and able to send
  Disconnected,
}
```

O `ClientsRegistryService` sempre reflete a realidade na hora, com debounce ou
sem — um dashboard deve mostrar um client como fora do ar no instante em que
ele cai.

## Motivos de queda

O `DisconnectReason` normaliza entre plataformas para um handler agir sem saber
qual está por baixo. Reconectar não adianta depois de um logout, e pedir um QR
novo é errado depois de uma rede instável.

| `DisconnectKind` | Significado |
|---|---|
| `LoggedOut` | Credenciais revogadas; precisa autenticar de novo |
| `AuthFailure` | A plataforma recusou as credenciais |
| `RestartRequired` | Restart esperado; a plataforma reconecta sozinha |
| `Forbidden` | A conta é recusada — bloqueada, ou inelegível |
| `ConnectionLost` | O transporte caiu; normalmente passageiro |
| `Conflict` | Outra sessão assumiu |
| `Unknown` | |

```typescript
@On('disconnected')
public onDrop(@Context() [, reason]: ContextOf<'disconnected'>) {
  if (isTerminalDisconnect(reason)) {
    this.alerts.send('needs a new QR code');
  }
}
```

O código e o texto da própria plataforma ficam em `reason.code` e
`reason.message` para os logs.

## Ignorando quedas curtas

Plataformas que reconectam sozinhas caem e se recuperam em segundos. Sem ajuda,
cada oscilação entrega aos handlers um par `disconnected`/`ready` de algo que
nunca saiu do ar de verdade.

```typescript
NestWhatsModule.forRoot({ disconnectDebounceMs: 30_000 })
```

Uma reconexão dentro da janela cancela o anúncio — e os eventos de recuperação
são engolidos junto, porque do ponto de vista de um handler nada aconteceu. Um
motivo terminal sempre anuncia na hora, já que reconexão nenhuma vem.

## Reconectando

Desligado por padrão: uma plataforma que tenta de novo internamente deve
continuar sendo dona disso, e ligar aqui correria contra as tentativas dela. O
whatsapp-web.js *não* tenta de novo — ele simplesmente para — então é ele que
precisa disto.

```typescript
NestWhatsModule.forRoot({
  reconnect: {},   // 1s doubling to 60s, 5 min cooldown when refused, never after a logout
})
```

Um timer por vez, e nada dispara para um client que voltou enquanto o timer
estava pendente.

## Desligamento

```typescript
app.enableShutdownHooks();
```

Sem isso, o Ctrl+C deixa navegadores e sockets para trás. O adapter do
whatsapp-web.js ainda desliga os handlers de sinal do próprio puppeteer, que
chamariam `process.exit()` antes de o Nest conseguir rodar os hooks dele.

## Health checks

```typescript title="src/health.controller.ts"
@Get('health')
@HealthCheck()
public check() {
  return this.health.check([() => this.whatsapp.isHealthy('whatsapp')]);
}
```

O `NestWhatsHealthIndicator` reporta o status de cada client pelo
[Terminus](https://docs.nestjs.com/recipes/terminus), o pacote de health check
do Nest.
