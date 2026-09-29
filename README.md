# saas-payment-service

Microserviço NestJS genérico para gestão de pagamentos dos seus SaaS. Recebe
depósitos via webhook, registra o histórico com trilha de saldo e mantém uma
carteira (wallet) única de gestão.

## Arquitetura

Clean Architecture com **inversão de dependência sobre o banco**: o domínio
define _ports_ (interfaces) e a infraestrutura os implementa com **TypeORM**. O
domínio não conhece o driver do banco — trocar de banco não toca no domínio.

```
src/
├── domain/                      # Regras de negócio (sem TypeORM)
│   ├── shared/
│   │   ├── enums/               # TransactionStatusEnum
│   │   └── ports/               # tokens (Symbols) + TransactionManagerPort
│   ├── wallet/
│   │   ├── models/              # WalletModel, WalletTransactionHistoryModel
│   │   └── ports/               # WalletRepositoryPort, WalletTransactionRepositoryPort
│   └── deposit/
│       ├── models/              # DepositWebhookLogModel
│       ├── ports/               # DepositWebhookLogRepositoryPort
│       └── use-cases/           # ProcessDepositWebhookUseCase
├── infrastructure/
│   └── database/
│       ├── entities/            # Entidades TypeORM (wallet, tx history, log)
│       ├── adapters/            # Implementam os ports + TransactionManager
│       ├── migrations/          # Geradas após escolher o banco
│       ├── typeorm-options.ts   # Único ponto que conhece o driver
│       ├── data-source.ts       # DataSource p/ o CLI de migrations
│       └── database.module.ts   # Liga cada port -> adapter
├── api/                         # Controllers + DTOs
├── config/                      # Config via env (agnóstica de banco)
├── app.module.ts
└── main.ts
```

## Tabelas

- **wallet** — carteira única de gestão. `balance` em centavos.
- **wallet_transaction_history** — cada crédito recebido: `source` (qual SaaS),
  `amount`, `previous_balance`, `new_balance`, `external_reference`, `status`.
- **deposit_webhook_log** — payload cru do webhook, vinculado à transação via
  `wallet_transaction_id`.

## Fluxo do webhook

`POST /webhook/:source` → grava `deposit_webhook_log` → (transação atômica)
lê saldo, cria `wallet_transaction_history` com saldo anterior/novo e atualiza
`wallet.balance` → vincula o log à transação. Idempotente por
`source + external_reference`.

Exemplo:

```bash
curl -X POST http://localhost:3000/webhook/saas-a \
  -H 'Content-Type: application/json' \
  -d '{"amount": 10050, "externalReference": "tx_abc123", "metadata": {"plan": "pro"}}'
```

## Escolher o banco (depois)

O serviço já compila sem banco. Quando decidir:

1. Copie `.env.example` para `.env` e preencha `DB_*` (principalmente `DB_TYPE`).
2. Instale o driver: `npm install pg` (Postgres), `mysql2` (MySQL/MariaDB),
   `sqlite3` (SQLite) ou `mssql` (SQL Server).
3. Gere e rode a migration:
   ```bash
   npm run migration:generate -- src/infrastructure/database/migrations/Init
   npm run migration:run
   ```

## Scripts

```bash
npm install
npm run build        # compila
npm run start:dev    # dev (precisa de banco conectado)
```
