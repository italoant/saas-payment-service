# saas-payment-service (Java / Spring Boot)

Microsserviço de gestão de pagamentos para SaaS — **porte Java/Spring Boot** da
versão original em NestJS (TypeScript), preservando a **arquitetura hexagonal**
(ports & adapters), toda a lógica de negócio, o schema do banco, o stub de
gateway, a documentação Swagger protegida por Basic Auth e os testes unitários.

Cria depósitos gerando um QR Code (PIX) no gateway, recebe a confirmação de
pagamento via webhook, registra o histórico com trilha de saldo e mantém uma
carteira (wallet) única de gestão. Também gere cobranças de assinatura,
prorrogando o vencimento do cliente (tabela `customers`, do front) na
confirmação do pagamento.

## Stack

- **Java 21**, **Spring Boot 3.3.5**
- Spring Web (controllers), Spring Data JPA / Hibernate (persistência)
- Bean Validation (validação de DTOs)
- Flyway (migrations)
- PostgreSQL (produção) e H2 (dev/testes)
- springdoc-openapi (Swagger UI)
- JUnit 5 + Mockito (testes)

## Arquitetura

Mesma Clean/Hexagonal Architecture do porte original, com **inversão de
dependência sobre o banco e o gateway**: o domínio define _ports_ (interfaces)
e a infraestrutura as implementa. O domínio não conhece JPA nem o provedor de
pagamento; trocar qualquer um deles não toca no domínio.

```
src/main/java/com/saas/payment/
├── domain/                      # Regras de negócio (sem JPA/gateway concreto)
│   ├── shared/
│   │   ├── enums/               # TransactionStatusEnum, SubscriptionPaymentStatusEnum
│   │   ├── exceptions/          # BadRequestException (400), NotFoundException (404)
│   │   ├── ports/               # TransactionManagerPort (+TransactionContext opaco)
│   │   └── PaidStatuses         # vocabulário de status "pago" do gateway
│   ├── wallet/
│   │   ├── models/              # WalletModel, WalletTransactionHistoryModel
│   │   └── ports/               # WalletRepositoryPort, WalletTransactionRepositoryPort
│   ├── deposit/
│   │   ├── models/              # DepositWebhookLogModel
│   │   ├── ports/               # DepositWebhookLogRepositoryPort, PaymentGatewayPort
│   │   └── usecases/            # CreateDepositUseCase, ProcessDepositWebhookUseCase
│   └── subscription/
│       ├── models/              # SubscriptionPaymentModel, CustomerSubscriptionModel
│       ├── ports/               # SubscriptionPaymentRepositoryPort, CustomerRepositoryPort
│       ├── usecases/            # CreateSubscriptionChargeUseCase, ProcessSubscriptionWebhookUseCase
│       └── SubscriptionPeriod   # lógica pura de vencimento (addDays, nextPeriodEnd, isOverdue)
├── infrastructure/
│   ├── database/
│   │   ├── entities/            # Entidades JPA (wallet, tx history, log, subscription_payment)
│   │   ├── repositories/        # Spring Data JPA repositories
│   │   └── adapters/            # Implementam os ports + SpringTransactionManager + CustomerRepositoryAdapter (SQL)
│   └── gateway/
│       └── StubPaymentGatewayAdapter  # Implementação temporária (stub) do PaymentGatewayPort
├── api/                         # Controllers + DTOs + GlobalExceptionHandler
├── config/                      # UseCasesConfig (wiring), OpenApiConfig, SwaggerAuthFilter, *Properties
├── SaasPaymentServiceApplication.java
└── resources/
    ├── application.yml          # config (Postgres por padrão, Swagger, wallet)
    ├── application-h2.yml        # profile h2 (dev sem Postgres)
    └── db/migration/            # Flyway: V1__init_wallet.sql, V2__init_subscription_payment.sql
```

### Mapa de equivalências com o porte NestJS

| NestJS (TypeScript)                       | Java (Spring Boot)                                 |
| ----------------------------------------- | -------------------------------------------------- |
| `@Injectable` use-case + `@Inject` tokens | classe pura + wiring em `UseCasesConfig` (`@Bean`) |
| `TransactionManagerPort` (ctx `unknown`)  | `TransactionManagerPort` + `TransactionTemplate`   |
| TypeORM entities/repositories             | JPA entities + Spring Data repositories            |
| TypeORM migrations (`Table`/`TableIndex`) | Flyway SQL (`db/migration`)                        |
| `class-validator` DTOs                    | Bean Validation (`@NotNull`/`@Positive`/`@Size`)   |
| `@nestjs/swagger` + Basic Auth middleware | springdoc-openapi + `SwaggerAuthFilter`            |
| `HttpException` (auto-map)                | `GlobalExceptionHandler` (`@RestControllerAdvice`) |
| Jest specs                                | JUnit 5 + Mockito                                  |

## Tabelas

- **wallet** — carteira única de gestão. `balance` em centavos.
- **wallet_transaction_history** — cada depósito: `source`, `amount`,
  `previous_balance`, `new_balance`, `external_reference`, `gateway_charge_id`
  e `status` (`pending` → `completed`). Índices únicos em
  `(source, external_reference)` e `(gateway_charge_id)` garantem idempotência.
- **deposit_webhook_log** — payload cru do webhook (TEXT/JSON), vinculado à
  transação via `wallet_transaction_id`.
- **subscription_payment** — cobranças de assinatura referenciando o cliente do
  front por `(source, external_id)`; `amount`, `interval_days`,
  `gateway_charge_id` (único), `status`, `paid_period_end`.
- **customers** — fonte da verdade da assinatura, **gerida pelo front**. Não tem
  entidade JPA; o `CustomerRepositoryAdapter` lê/escreve `sub_status` e
  `sub_due_date` via SQL direto.

## Endpoints

| Método | Rota                              | Descrição                                      |
| ------ | --------------------------------- | ---------------------------------------------- |
| GET    | `/health`                         | Health check.                                  |
| POST   | `/deposits/{source}`              | Cria depósito e retorna o QR Code (201).       |
| POST   | `/webhook`                        | Confirma depósito pelo `gatewayChargeId` (200).|
| POST   | `/subscriptions/{source}/charges` | Cria cobrança de assinatura (201).             |
| POST   | `/webhook/subscription`           | Confirma assinatura e prorroga vencimento (200)|
| GET    | `/doc`                            | Swagger UI (Basic Auth).                       |
| GET    | `/doc-json`                       | OpenAPI JSON (Basic Auth).                     |

### Fluxo de depósito (dois passos)

```bash
# 1. Criar o depósito (gera o QR Code)
curl -X POST http://localhost:3000/deposits/saas-a \
  -H 'Content-Type: application/json' \
  -d '{"amount": 10050, "externalReference": "tx_abc123"}'
# => { transactionId, status: "pending", amount, gatewayChargeId, qrCode: {...} }

# 2. Confirmar o pagamento (webhook do gateway — só o id da cobrança)
curl -X POST http://localhost:3000/webhook \
  -H 'Content-Type: application/json' \
  -d '{"id": "stub_...", "status": "paid"}'
# => { transactionId, source, previousBalance, newBalance, status: "completed" }
```

Idempotência: depósito duplicado por `(source, externalReference)` é rejeitado;
um segundo webhook para a mesma cobrança não credita de novo. Se o `status` não
for de pagamento confirmado, o log é gravado mas o saldo não é creditado.

## Gateway de pagamento

O gateway é acessado pelo domínio apenas através da `PaymentGatewayPort`. Hoje
há um **adapter stub** (`StubPaymentGatewayAdapter`) que gera um QR Code
sintético para desenvolvimento — **não** é um BR Code PIX válido.

Para integrar o gateway real:

1. Crie um adapter que implemente `PaymentGatewayPort` (ex.: chamando a API HTTP
   do provedor) e anote-o como `@Component @Primary` (ou remova o stub).
2. Ajuste, se necessário, os valores de status considerados "pago" em
   `domain/shared/PaidStatuses` conforme o vocabulário do provedor.

Nenhuma outra camada precisa mudar.

## Como rodar

Pré-requisitos: JDK 21 e Maven. (Neste ambiente foram instalados em
`~/tools/jdk-21.0.12.1+1` e `~/tools/apache-maven-3.9.9`; use
`source ~/tools/env.sh` para carregá-los no PATH.)

```bash
# Testes unitários (não precisam de banco)
mvn test

# Dev rápido sem Postgres (H2 em memória, modo Postgres, mesmas migrations)
mvn spring-boot:run -Dspring-boot.run.profiles=h2

# Build do jar executável
mvn -DskipTests package
java -jar target/saas-payment-service-0.1.0.jar          # usa Postgres (ver .env)
SPRING_PROFILES_ACTIVE=h2 java -jar target/saas-payment-service-0.1.0.jar
```

Serviço em `http://localhost:3000` (doc em `/doc`).

## Variáveis de ambiente

Veja `.env.example`. As principais:

| Variável                  | Padrão        | Descrição                                 |
| ------------------------- | ------------- | ----------------------------------------- |
| `PORT`                    | `3000`        | Porta HTTP.                               |
| `DB_HOST`                 | `localhost`   | Host do Postgres.                         |
| `DB_PORT`                 | `5432`        | Porta do Postgres.                        |
| `DB_DATABASE`             | `saas_payments` | Nome do banco.                          |
| `DB_USERNAME`             | `postgres`    | Usuário.                                  |
| `DB_PASSWORD`             | `postgres`    | Senha.                                    |
| `WALLET_DEFAULT_CURRENCY` | `BRL`         | Moeda padrão da wallet (ISO 4217).        |
| `SWAGGER_USER`            | `admin`       | Usuário do Basic Auth da doc.             |
| `SWAGGER_PASSWORD`        | `changeme`    | Senha do Basic Auth da doc (troque!).     |

> Spring Boot lê variáveis de ambiente diretamente (não lê `.env`
> automaticamente). Exporte-as no shell/plataforma ou use um carregador como
> `direnv`/`dotenv-cli`. Em produção, prefira o pooler do Supabase para o
> runtime e a conexão direta para rodar migrations, como no porte original.

As migrations Flyway rodam automaticamente no startup (`spring.flyway.enabled=true`).
`spring.jpa.hibernate.ddl-auto=validate` garante que o schema do banco bate com
as entidades — produção nunca altera schema via Hibernate, apenas via Flyway.

## Testes

33 testes unitários (JUnit 5 + Mockito) espelham os specs do Jest original,
cobrindo a lógica de negócio (use-cases, controllers, gateway stub e a lógica
pura de período de assinatura), com as _ports_ mockadas — não precisam de banco.
Os adapters JPA são infraestrutura dependente de banco e ficam para testes de
integração.
