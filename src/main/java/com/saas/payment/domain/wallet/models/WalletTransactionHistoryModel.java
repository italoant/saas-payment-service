package com.saas.payment.domain.wallet.models;

import com.saas.payment.domain.shared.enums.TransactionStatusEnum;

import java.time.Instant;

/**
 * Model de dominio de uma entrada no historico de transacoes da wallet.
 *
 * <p>Cada registro representa um credito recebido de um SaaS de origem,
 * guardando o saldo anterior e o saldo resultante para trilha de auditoria.
 * Valores em centavos (inteiro).
 */
public class WalletTransactionHistoryModel {

    private Long id;
    private Long walletId;
    /** Identificador do SaaS que originou o credito (ex.: "saas-a"). */
    private String source;
    /** Valor que entrou, em centavos. */
    private long amount;
    /** Saldo da wallet antes deste credito, em centavos. */
    private long previousBalance;
    /** Saldo resultante (previousBalance + amount), em centavos. */
    private long newBalance;
    /** Referencia da transacao no sistema de origem (idempotencia). */
    private String externalReference;
    /**
     * Identificador da cobranca no gateway. Usado para conciliar o webhook de
     * confirmacao, que chega apenas com este id.
     */
    private String gatewayChargeId;
    private TransactionStatusEnum status;
    private Instant createdAt;

    public WalletTransactionHistoryModel() {
    }

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

    public TransactionStatusEnum getStatus() {
        return status;
    }

    public void setStatus(TransactionStatusEnum status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
