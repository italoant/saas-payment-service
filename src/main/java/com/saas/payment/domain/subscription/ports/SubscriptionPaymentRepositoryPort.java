package com.saas.payment.domain.subscription.ports;

import com.saas.payment.domain.shared.enums.SubscriptionPaymentStatusEnum;
import com.saas.payment.domain.shared.ports.TransactionManagerPort.TransactionContext;
import com.saas.payment.domain.subscription.models.SubscriptionPaymentModel;

import java.time.Instant;

public interface SubscriptionPaymentRepositoryPort {

    /** Dados aplicados na confirmacao do pagamento. */
    record SettlementData(SubscriptionPaymentStatusEnum status, Instant paidPeriodEnd) {
    }

    /** Cria uma cobranca (PENDING). */
    SubscriptionPaymentModel create(SubscriptionPaymentModel data, TransactionContext ctx);

    /**
     * Busca uma cobranca pelo id da cobranca no gateway. Usada pelo webhook —
     * que chega apenas com esse id — para localizar o cliente a prorrogar.
     */
    SubscriptionPaymentModel findByGatewayChargeId(String gatewayChargeId, TransactionContext ctx);

    /** Atualiza status/vencimento aplicado na confirmacao do pagamento. */
    SubscriptionPaymentModel updateSettlement(long id, SettlementData data, TransactionContext ctx);
}
