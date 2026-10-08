-- V1: Tabelas de wallet e deposito.
-- Equivalente a migration InitWallet1729990000000 do porte NestJS/TypeORM.
-- Valores monetarios em centavos (bigint). Chaves primarias e FKs em BIGINT
-- (modelo Java usa Long), um superconjunto seguro do int do porte original.

CREATE TABLE wallet (
    wallet_id  BIGSERIAL PRIMARY KEY,
    balance    BIGINT       NOT NULL DEFAULT 0,
    currency   VARCHAR(3)   NOT NULL DEFAULT 'BRL',
    created_at TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE wallet_transaction_history (
    id                 BIGSERIAL PRIMARY KEY,
    wallet_id          BIGINT       NOT NULL,
    source             VARCHAR(100) NOT NULL,
    amount             BIGINT       NOT NULL,
    previous_balance   BIGINT       NOT NULL,
    new_balance        BIGINT       NOT NULL,
    external_reference VARCHAR(255),
    gateway_charge_id  VARCHAR(255),
    status             VARCHAR(20)  NOT NULL DEFAULT 'completed',
    created_at         TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT fk_wallet_tx_wallet FOREIGN KEY (wallet_id) REFERENCES wallet (wallet_id)
);

-- Idempotencia a nivel de banco: o mesmo evento de um SaaS nao e creditado duas vezes.
CREATE UNIQUE INDEX uq_wallet_tx_source_ref
    ON wallet_transaction_history (source, external_reference);
CREATE UNIQUE INDEX uq_wallet_tx_gateway_charge_id
    ON wallet_transaction_history (gateway_charge_id);

CREATE TABLE deposit_webhook_log (
    id                    BIGSERIAL PRIMARY KEY,
    source                VARCHAR(100) NOT NULL,
    payload               TEXT         NOT NULL,
    wallet_transaction_id BIGINT,
    created_at            TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT fk_deposit_log_tx FOREIGN KEY (wallet_transaction_id)
        REFERENCES wallet_transaction_history (id)
);

CREATE INDEX idx_deposit_log_tx ON deposit_webhook_log (wallet_transaction_id);
