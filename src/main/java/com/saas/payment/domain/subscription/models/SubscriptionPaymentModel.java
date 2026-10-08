package com.saas.payment.domain.subscription.models;

import com.saas.payment.domain.shared.enums.SubscriptionPaymentStatusEnum;

import java.time.Instant;

/**
 * Model de dominio de uma cobranca de assinatura.
 *
 * <p>A fonte da verdade da assinatura e o cliente no front (tabela
 * {@code customers} no Supabase). Esta tabela guarda apenas as cobrancas
 * geradas no gateway e as concilia via webhook — ao confirmar, o cliente e
 * prorrogado diretamente no {@code customers}.
 *
 * <p>O cliente e referenciado por (source, externalId):
 * <ul>
 *   <li>source     = id do SaaS (saasId)</li>
 *   <li>externalId = id do cliente no front (customer.id)</li>
 * </ul>
 *
 * <p>Nao ha tabelas {@code plan} nem {@code subscription}: o valor e o
 * intervalo de renovacao vivem na propria cobranca. Valores em centavos.
 */
public class SubscriptionPaymentModel {

    private Long id;
    /** SaaS de origem (saasId). */
    private String source;
    /** Id do cliente no front (customer.id). */
    private String externalId;
    /** Valor cobrado, em centavos. */
    private long amount;
    /** Intervalo de renovacao em dias (ex.: 30 = mensal). */
    private int intervalDays;
    /**
     * Id da cobranca no gateway. Chave de conciliacao do webhook — que chega
     * apenas com este id.
     */
    private String gatewayChargeId;
    private SubscriptionPaymentStatusEnum status;
    /**
     * Novo vencimento aplicado ao cliente na confirmacao deste pagamento.
     * Preenchido quando o pagamento e confirmado (trilha de auditoria).
     */
    private Instant paidPeriodEnd;
    private Instant createdAt;

    public SubscriptionPaymentModel() {
    }

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

    public SubscriptionPaymentStatusEnum getStatus() {
        return status;
    }

    public void setStatus(SubscriptionPaymentStatusEnum status) {
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
