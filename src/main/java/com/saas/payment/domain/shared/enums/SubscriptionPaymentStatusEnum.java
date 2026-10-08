package com.saas.payment.domain.shared.enums;

/**
 * Situacao de uma cobranca individual de assinatura
 * ({@code subscription_payment}).
 *
 * <pre>
 *   PENDING -> cobranca criada no gateway, aguardando confirmacao (webhook).
 *   PAID    -> pagamento confirmado; o periodo da assinatura foi prorrogado.
 *   FAILED  -> gateway informou status de nao pagamento (ex.: expirado).
 * </pre>
 */
public enum SubscriptionPaymentStatusEnum {
    PENDING("pending"),
    PAID("paid"),
    FAILED("failed");

    private final String value;

    SubscriptionPaymentStatusEnum(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static SubscriptionPaymentStatusEnum fromValue(String value) {
        for (SubscriptionPaymentStatusEnum e : values()) {
            if (e.value.equalsIgnoreCase(value)) {
                return e;
            }
        }
        throw new IllegalArgumentException("Unknown SubscriptionPaymentStatusEnum: " + value);
    }
}
