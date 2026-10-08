package com.saas.payment.domain.deposit.ports;

import com.saas.payment.domain.deposit.models.DepositWebhookLogModel;
import com.saas.payment.domain.shared.ports.TransactionManagerPort.TransactionContext;

public interface DepositWebhookLogRepositoryPort {

    /** Persiste o log do webhook recebido. */
    DepositWebhookLogModel create(DepositWebhookLogModel data, TransactionContext ctx);

    /**
     * Vincula um log ja gravado a transacao criada, permitindo saber de qual
     * transacao vieram os logs.
     */
    void linkToTransaction(long logId, long walletTransactionId, TransactionContext ctx);
}
