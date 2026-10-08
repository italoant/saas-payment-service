package com.saas.payment.domain.subscription;

import java.time.Duration;
import java.time.Instant;

/**
 * Regras de negocio puras sobre o periodo de uma assinatura.
 *
 * <p>Sem dependencia de banco nem de framework — faceis de testar e reutilizar
 * pelos use-cases. Espelham a logica de vencimento do front de gestao, mas
 * aqui a fonte da verdade e o pagamento confirmado pelo gateway.
 *
 * <p>Um "dia" e tratado como 24h fixas (como no porte original em JS), somando
 * milissegundos — nao ha ajuste de fuso/horario de verao.
 */
public final class SubscriptionPeriod {

    private SubscriptionPeriod() {
    }

    /** Retorna uma nova data somando {@code days} a {@code from} (imutavel). */
    public static Instant addDays(Instant from, int days) {
        return from.plus(Duration.ofDays(days));
    }

    /**
     * Calcula o novo vencimento ao confirmar um pagamento.
     *
     * <ul>
     *   <li>Primeira confirmacao (sem periodo vigente): conta a partir de
     *       {@code paidAt}.</li>
     *   <li>Renovacao em dia (periodo ainda no futuro): estende a partir do
     *       vencimento atual, preservando a data-base (nao perde dias pagos).</li>
     *   <li>Renovacao atrasada (periodo ja vencido): conta a partir de
     *       {@code paidAt}, pois o ciclo recomeca no pagamento.</li>
     * </ul>
     */
    public static Instant nextPeriodEnd(Instant currentPeriodEnd, int intervalDays, Instant paidAt) {
        if (currentPeriodEnd != null && currentPeriodEnd.isAfter(paidAt)) {
            return addDays(currentPeriodEnd, intervalDays);
        }
        return addDays(paidAt, intervalDays);
    }

    /** Indica se o periodo esta vencido na data de referencia. */
    public static boolean isOverdue(Instant currentPeriodEnd, Instant ref) {
        if (currentPeriodEnd == null) {
            return true;
        }
        return currentPeriodEnd.isBefore(ref);
    }
}
