-- V2: Tabela de cobrancas de assinatura.
-- Equivalente as migrations InitSubscriptions1730000000000 /
-- RemodelSubscription1730001000000 do porte NestJS/TypeORM (modelo coeso final:
-- referencia o cliente por source+external_id, sem FK, com amount+interval_days).

CREATE TABLE subscription_payment (
    id                BIGSERIAL PRIMARY KEY,
    source            VARCHAR(100) NOT NULL,
    external_id       VARCHAR(255) NOT NULL,
    amount            BIGINT       NOT NULL,
    interval_days     INT          NOT NULL,
    gateway_charge_id VARCHAR(255) NOT NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'pending',
    paid_period_end   TIMESTAMP,
    created_at        TIMESTAMP    NOT NULL DEFAULT now()
);

-- Idempotencia da conciliacao do webhook.
CREATE UNIQUE INDEX uq_subscription_payment_gateway_charge_id
    ON subscription_payment (gateway_charge_id);
CREATE INDEX idx_subscription_payment_customer
    ON subscription_payment (source, external_id);
