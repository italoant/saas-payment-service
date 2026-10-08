package com.saas.payment.infrastructure.database.entities;

import com.saas.payment.domain.shared.enums.TransactionStatusEnum;
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
 * Entidade JPA do historico de transacoes. Tabela
 * {@code wallet_transaction_history}.
 *
 * <p>O indice unico (source, external_reference) e o indice unico em
 * (gateway_charge_id) garantem idempotencia a nivel de banco: o mesmo evento
 * de um SaaS nao pode ser creditado duas vezes.
 *
 * <p>O {@code status} e persistido como texto ("pending"/"completed"/"failed")
 * via conversor dedicado, preservando o mesmo formato do porte original.
 */
@Entity
@Table(name = "wallet_transaction_history", indexes = {
        @Index(name = "uq_wallet_tx_source_ref", columnList = "source,external_reference", unique = true),
        @Index(name = "uq_wallet_tx_gateway_charge_id", columnList = "gateway_charge_id", unique = true)
})
public class WalletTransactionHistoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "wallet_id", nullable = false)
    private Long walletId;

    /** SaaS de origem do credito. */
    @Column(name = "source", length = 100, nullable = false)
    private String source;

    /** Valor creditado, em centavos. */
    @Column(name = "amount", nullable = false)
    private long amount;

    /** Saldo anterior ao credito, em centavos. */
    @Column(name = "previous_balance", nullable = false)
    private long previousBalance;

    /** Saldo resultante, em centavos. */
    @Column(name = "new_balance", nullable = false)
    private long newBalance;

    /** Referencia da transacao no sistema de origem. */
    @Column(name = "external_reference", length = 255)
    private String externalReference;

    /** Identificador da cobranca no gateway (conciliacao do webhook). */
    @Column(name = "gateway_charge_id", length = 255)
    private String gatewayChargeId;

    @Column(name = "status", length = 20, nullable = false)
    private String status = TransactionStatusEnum.COMPLETED.getValue();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getWalletId() {
        return walletId;
    }

    public void setWalletId(Long walletId) {
        this.walletId = walletId;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public long getAmount() {
        return amount;
    }

    public void setAmount(long amount) {
        this.amount = amount;
    }

    public long getPreviousBalance() {
        return previousBalance;
    }

    public void setPreviousBalance(long previousBalance) {
        this.previousBalance = previousBalance;
    }

    public long getNewBalance() {
        return newBalance;
    }

    public void setNewBalance(long newBalance) {
        this.newBalance = newBalance;
    }

    public String getExternalReference() {
        return externalReference;
    }

    public void setExternalReference(String externalReference) {
        this.externalReference = externalReference;
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

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
