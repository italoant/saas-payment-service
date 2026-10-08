package com.saas.payment.domain.shared;

import java.util.Set;

/**
 * Valores de status que o gateway pode enviar para indicar que o pagamento foi
 * confirmado. Como o gateway ainda nao foi definido, tratamos os mais comuns;
 * quando {@code status} nao vier, assumimos confirmacao (o webhook so e chamado
 * em eventos de pagamento).
 *
 * <p>Para integrar um gateway real, ajuste este conjunto conforme o vocabulario
 * do provedor.
 */
public final class PaidStatuses {

    private PaidStatuses() {
    }

    private static final Set<String> VALUES = Set.of(
            "paid", "approved", "confirmed", "completed", "success", "succeeded");

    /**
     * Verdadeiro quando {@code status} e null/vazio (assume confirmacao) ou
     * corresponde (case-insensitive, com trim) a um status de pagamento.
     */
    public static boolean isPaid(String status) {
        if (status == null) {
            return true;
        }
        return VALUES.contains(status.trim().toLowerCase());
    }
}
