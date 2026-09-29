# saas-payment-service

Microserviço NestJS genérico para gestão de pagamentos dos seus SaaS. Cria
depósitos gerando um QR Code (PIX) no gateway, recebe a confirmação de
pagamento via webhook, registra o histórico com trilha de saldo e mantém uma
carteira (wallet) única de gestão.

## Arquitetura

Clean Architecture com **inversão de dependência sobre o banco e o gateway**:
o domínio define _ports_ (interfaces) e a infraestrutura as implementa — com
**TypeORM** para persistência e com um _adapter_ de gateway plugável. O domínio
não conhece o driver do banco nem o provedor de pagamento; trocar qualquer um
deles não toca no domínio.

```
src/
├── domain/                      # Regras de negócio (sem TypeORM/gateway concreto)
│   ├── shared/
│   │   ├── enums/               # TransactionStatusEnum (pending/completed/failed)
│   │   └── ports/               # tokens (Symbols) + TransactionManagerPort
│   ├── wallet/
│   │   ├── models/              # WalletModel, WalletTransactionHistoryModel
│   │   └── ports/               # WalletRepositoryPort, WalletTransactionRepositoryPort
│   └── deposit/
│       ├── models/              # DepositWebhookLogModel
│       ├── ports/               # DepositWebhookLogRepositoryPort, PaymentGatewayPort
│       └── use-cases/           # CreateDepositUseCase, ProcessDepositWebhookUseCase
├── infrastructure/
│   ├── database/
│   │   ├── entities/            # Entidades TypeORM (wallet, tx history, log)
│   │   ├── adapters/            # Implementam os ports + TransactionManager
│   │   ├── migrations/          # Geradas após escolher o banco
│   │   ├── typeorm-options.ts   # Único ponto que conhece o driver
│   │   ├── data-source.ts       # DataSource p/ o CLI de migrations
│   │   └── database.module.ts   # Liga cada port -> adapter
│   └── gateway/
│       ├── stub-payment-gateway.adapter.ts  # Implementação temporária (stub)
│       └── gateway.module.ts    # Liga PaymentGatewayPort -> adapter concreto
├── api/                         # Controllers + DTOs
├── config/                      # Config via env (agnóstica de banco)
├── app.module.ts
└── main.ts
```

## Tabelas

- **wallet** — carteira única de gestão. `balance` em centavos.
- **wallet_transaction_history** — cada depósito: `source` (qual SaaS),
  `amount`, `previous_balance`, `new_balance`, `external_reference` (referência
  do SaaS), `gateway_charge_id` (id da cobrança no gateway, chave de
  conciliação do webhook) e `status` (`pending` → `completed`).
- **deposit_webhook_log** — payload cru do webhook, vinculado à transação via
  `wallet_transaction_id`.

## Fluxo de depósito

O depósito acontece em **dois passos**:

### 1. Criar o depósito (gera o QR Code)

`POST /deposits/:source` → chama o gateway para gerar a cobrança (QR Code) →
registra a `wallet_transaction_history` como **`pending`** (o saldo ainda **não**
é creditado) guardando o `gateway_charge_id` → retorna o QR Code para o cliente
pagar. Idempotente por `source + external_reference`.

```bash
curl -X POST http://localhost:3000/deposits/saas-a \
  -H 'Content-Type: application/json' \
  -d '{"amount": 10050, "externalReference": "tx_abc123"}'
```

Resposta:

```json
{
  "transactionId": 10,
  "status": "pending",
  "amount": 10050,
  "gatewayChargeId": "stub_9b1deb4d-...",
  "qrCode": {
    "payload": "00020126|stub-charge:stub_9b1deb4d-...|source:saas-a|amount:10050|ref:tx_abc123",
    "image": null,
    "expiresAt": "2026-01-01T00:00:00.000Z"
  }
}
```

### 2. Confirmar o pagamento (webhook do gateway)

`POST /webhook` → o gateway envia **apenas o id da cobrança** (e opcionalmente um
status). O serviço **não** recebe o `source`: ele localiza a transação pendente
pelo `gateway_charge_id`, descobre o `source` e os dados, e então — numa
transação atômica — credita o saldo da wallet e move a transação de `pending`
para `completed`. Idempotente: um segundo webhook para a mesma cobrança não
credita de novo. Se o `status` informado não for de pagamento confirmado, o log
é gravado mas o saldo não é creditado.

```bash
curl -X POST http://localhost:3000/webhook \
  -H 'Content-Type: application/json' \
  -d '{"id": "stub_9b1deb4d-...", "status": "paid"}'
```

Resposta:

```json
{
  "transactionId": 10,
  "source": "saas-a",
  "previousBalance": 5000,
  "newBalance": 15050,
  "status": "completed"
}
```

## Gateway de pagamento

O gateway é acessado pelo domínio apenas através da `PaymentGatewayPort`. Hoje
há um **adapter stub** (`StubPaymentGatewayAdapter`) que gera um QR Code
sintético para desenvolvimento — **não** é um BR Code PIX válido.

Para integrar o gateway real:

1. Crie um adapter que implemente `PaymentGatewayPort` (ex.: chamando a API HTTP
   do provedor).
2. Troque o `useClass` do provider `PAYMENT_GATEWAY` em
   `src/infrastructure/gateway/gateway.module.ts`.
3. Ajuste, se necessário, os valores de status considerados "pago" em
   `ProcessDepositWebhookUseCase` (`PAID_STATUSES`) conforme o vocabulário do
   provedor.

Nenhuma outra camada precisa mudar.

## Escolher o banco (depois)

O serviço já compila sem banco. Quando decidir:

1. Copie `.env.example` para `.env` e preencha `DB_*` (principalmente `DB_TYPE`).
2. Instale o driver: `npm install pg` (Postgres), `mysql2` (MySQL/MariaDB),
   `sqlite3` (SQLite) ou `mssql` (SQL Server).
3. Gere e rode a migration (inclui a coluna `gateway_charge_id`):
   ```bash
   npm run migration:generate -- src/infrastructure/database/migrations/Init
   npm run migration:run
   ```

## Scripts

```bash
npm install
npm run build        # compila
npm run start:dev    # dev (precisa de banco conectado)
npm test             # testes unitários
npm run test:cov     # testes com cobertura
```

## Testes

Testes unitários com **Jest** cobrem a lógica de negócio (use-cases,
controllers e o adapter de gateway), com as _ports_ mockadas — não precisam de
banco. Os adapters TypeORM são infraestrutura dependente de banco e ficam para
testes de integração.

```bash
npm test
```

