package com.saas.payment.domain.wallet.models;

import java.time.Instant;

/**
 * Model de dominio da Wallet.
 *
 * <p>Representa a carteira unica de gestao. Este model e puro (sem anotacoes de
 * ORM) — a entidade JPA correspondente vive na camada de infraestrutura. O
 * {@code balance} e armazenado em centavos (inteiro) para evitar imprecisao de
 * ponto flutuante.
 */
public class WalletModel {

    private Long walletId;
    /** Saldo atual em centavos. */
    private long balance;
    /** Moeda ISO 4217 (ex.: BRL, USD). */
    private String currency;
    private Instant createdAt;
    private Instant updatedAt;

    public WalletModel() {
    }

    public WalletModel(Long walletId, long balance, String currency) {
        this.walletId = walletId;
        this.balance = balance;
        this.currency = currency;
    }

    public Long getWalletId() {
        return walletId;
    }

    public void setWalletId(Long walletId) {
        this.walletId = walletId;
    }

    public long getBalance() {
        return balance;
    }

    public void setBalance(long balance) {
        this.balance = balance;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
