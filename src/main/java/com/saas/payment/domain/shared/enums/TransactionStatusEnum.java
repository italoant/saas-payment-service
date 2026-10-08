package com.saas.payment.domain.shared.enums;

/**
 * Status de uma entrada na wallet_transaction_history.
 */
public enum TransactionStatusEnum {
    /** Registrada, saldo ainda nao aplicado a wallet. */
    PENDING("pending"),
    /** Saldo aplicado com sucesso a wallet. */
    COMPLETED("completed"),
    /** Descartada (ex.: payload invalido, duplicada). */
    FAILED("failed");

    private final String value;

    TransactionStatusEnum(String value) {
        this.value = value;
    }

    /** Valor persistido/serializado (ex.: "pending"), equivalente ao enum TS. */
    public String getValue() {
        return value;
    }

    public static TransactionStatusEnum fromValue(String value) {
        for (TransactionStatusEnum e : values()) {
            if (e.value.equalsIgnoreCase(value)) {
                return e;
            }
        }
        throw new IllegalArgumentException("Unknown TransactionStatusEnum: " + value);
    }
}
