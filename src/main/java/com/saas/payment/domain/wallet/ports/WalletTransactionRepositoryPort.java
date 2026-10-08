package com.saas.payment.domain.wallet.ports;

import com.saas.payment.domain.shared.enums.TransactionStatusEnum;
import com.saas.payment.domain.shared.ports.TransactionManagerPort.TransactionContext;
import com.saas.payment.domain.wallet.models.WalletTransactionHistoryModel;

public interface WalletTransactionRepositoryPort {

    /** Dados aplicados na confirmacao do pagamento (settlement). */
    record SettlementData(TransactionStatusEnum status, long previousBalance, long newBalance) {
    }

    /** Cria uma entrada no historico de transacoes. */
    WalletTransactionHistoryModel create(WalletTransactionHistoryModel data, TransactionContext ctx);

    /**
     * Busca uma transacao pela referencia externa (origem + referencia),
     * usada para idempotencia — evita creditar o mesmo evento duas vezes.
     */
    WalletTransactionHistoryModel findByExternalReference(String source, String externalReference,
                                                          TransactionContext ctx);

    /**
     * Busca uma transacao pelo id da cobranca no gateway. Usada pelo webhook de
     * confirmacao, que chega apenas com esse id — e assim que o servico
     * descobre o {@code source} e os demais dados do deposito.
     */
    WalletTransactionHistoryModel findByGatewayChargeId(String gatewayChargeId, TransactionContext ctx);

    /**
     * Atualiza uma transacao existente na confirmacao do pagamento: aplica o
     * novo status e o saldo resultante (previous/new balance).
     */
    WalletTransactionHistoryModel updateSettlement(long id, SettlementData data, TransactionContext ctx);
}
