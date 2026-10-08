package com.saas.payment.infrastructure.database.entities;

import com.saas.payment.domain.shared.enums.SubscriptionPaymentStatusEnum;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Entidade JPA de cobranca de assinatura. Tabela {@code subscription_payment}.
 *
 * <p>Referencia o cliente do front por (source, external_id) — sem FK, pois o
 * cliente vive em outra base (Supabase {@code customers}, gerida pelo front).
 * O indice unico em {@code gateway_charge_id} garante conciliacao idempotente
 * do webhook. Valor e intervalo ficam aqui.
 */
@Entity
@Table(name = "subscription_payment", indexes = {
        @Index(name = "uq_subscription_payment_gateway_charge_id", columnList = "gateway_charge_id", unique = true),
        @Index(name = "idx_subscription_payment_customer", columnList = "source,external_id")
})
public class SubscriptionPaymentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** SaaS de origem (saasId). */
    @Column(name = "source", length = 100, nullable = false)
    private String source;

    /** Id do cliente no front (customer.id). */
    @Column(name = "external_id", length = 255, nullable = false)
    private String externalId;

    /** Valor cobrado, em centavos. */
    @Column(name = "amount", nullable = false)
    private long amount;

    /** Intervalo de renovacao em dias (ex.: 30 = mensal). */
    @Column(name = "interval_days", nullable = false)
    private int intervalDays;

    @Column(name = "gateway_charge_id", length = 255, nullable = false)
    private String gatewayChargeId;

    @Column(name = "status", length = 20, nullable = false)
    private String status = SubscriptionPaymentStatusEnum.PENDING.getValue();

    /** Vencimento aplicado ao cliente na confirmacao deste pagamento. */
    @Column(name = "paid_period_end")
    private Instant paidPeriodEnd;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getExternalId() {
        return externalId;
    }

    public void setExternalId(String externalId) {
        this.externalId = externalId;
    }

    public long getAmount() {
        return amount;
    }

    public void setAmount(long amount) {
        this.amount = amount;
    }

    public int getIntervalDays() {
        return intervalDays;
    }

    public void setIntervalDays(int intervalDays) {
        this.intervalDays = intervalDays;
    }

    public String getGatewayChargeId() {
        return gatewayChargeId;
    }

    public void setGatewayChargeId(String gatewayChargeId) {
        this.gatewayChargeId = gatewayChargeId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getPaidPeriodEnd() {
        return paidPeriodEnd;
    }

    public void setPaidPeriodEnd(Instant paidPeriodEnd) {
        this.paidPeriodEnd = paidPeriodEnd;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
