package com.saas.payment.domain.deposit.models;

import java.time.Instant;
import java.util.Map;

/**
 * Model de dominio do log de webhook de deposito.
 *
 * <p>Guarda o payload cru recebido de um SaaS e o vincula a transacao gerada
 * ({@code walletTransactionId}), permitindo rastrear de qual transacao vieram
 * os logs.
 */
public class DepositWebhookLogModel {

    private Long id;
    /** SaaS que enviou o webhook. */
    private String source;
    /** Payload cru recebido (JSON). */
    private Map<String, Object> payload;
    /**
     * Transacao vinculada. Fica null quando o log e gravado antes de a
     * transacao ser criada (ex.: payload rejeitado).
     */
    private Long walletTransactionId;
    private Instant createdAt;

    public DepositWebhookLogModel() {
    }

    public DepositWebhookLogModel(String source, Map<String, Object> payload) {
        this.source = source;
        this.payload = payload;
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

    public Map<String, Object> getPayload() {
        return payload;
    }

    public void setPayload(Map<String, Object> payload) {
        this.payload = payload;
    }

    public Long getWalletTransactionId() {
        return walletTransactionId;
    }

    public void setWalletTransactionId(Long walletTransactionId) {
        this.walletTransactionId = walletTransactionId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
