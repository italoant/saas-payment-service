package com.saas.payment.domain.subscription.ports;

import com.saas.payment.domain.shared.ports.TransactionManagerPort.TransactionContext;
import com.saas.payment.domain.subscription.models.CustomerSubscriptionModel;

import java.time.Instant;

/**
 * Port de saida para o cliente (tabela {@code customers}, fonte da verdade da
 * assinatura, gerida pelo front). O backend de pagamento apenas:
 * <ul>
 *   <li>le o vencimento atual (para calcular a prorrogacao);</li>
 *   <li>marca como pago e prorroga o vencimento ao confirmar o pagamento.</li>
 * </ul>
 */
public interface CustomerRepositoryPort {

    /** Busca o snapshot da assinatura do cliente. Null se nao existir. */
    CustomerSubscriptionModel findById(String id, TransactionContext ctx);

    /**
     * Marca o cliente como pago e aplica o novo vencimento. Corresponde a
     * {@code UPDATE customers SET sub_status='pago', sub_due_date=$due WHERE id=$id}.
     */
    void markPaid(String id, Instant newDueDate, TransactionContext ctx);
}
