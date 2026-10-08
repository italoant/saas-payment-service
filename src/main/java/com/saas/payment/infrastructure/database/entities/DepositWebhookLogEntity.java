package com.saas.payment.infrastructure.database.entities;

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
 * Entidade JPA do log de webhook. Tabela {@code deposit_webhook_log}.
 *
 * <p>Guarda o payload cru (serializado como texto JSON) e o vincula a transacao
 * gerada, permitindo rastrear de qual transacao vieram os logs.
 */
@Entity
@Table(name = "deposit_webhook_log", indexes = {
        @Index(name = "idx_deposit_log_tx", columnList = "wallet_transaction_id")
})
public class DepositWebhookLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source", length = 100, nullable = false)
    private String source;

    /** Payload cru serializado como JSON (texto), portavel entre bancos. */
    @Column(name = "payload", nullable = false, columnDefinition = "text")
    private String payload;

    @Column(name = "wallet_transaction_id")
    private Long walletTransactionId;

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

    public String getPayload() {
        return payload;
    }

    public void setPayload(String payload) {
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
