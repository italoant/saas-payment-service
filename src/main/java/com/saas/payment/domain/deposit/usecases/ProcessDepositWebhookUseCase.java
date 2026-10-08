package com.saas.payment.domain.deposit.usecases;

import com.saas.payment.domain.deposit.models.DepositWebhookLogModel;
import com.saas.payment.domain.deposit.ports.DepositWebhookLogRepositoryPort;
import com.saas.payment.domain.shared.PaidStatuses;
import com.saas.payment.domain.shared.enums.TransactionStatusEnum;
import com.saas.payment.domain.shared.exceptions.NotFoundException;
import com.saas.payment.domain.shared.ports.TransactionManagerPort;
import com.saas.payment.domain.wallet.models.WalletModel;
import com.saas.payment.domain.wallet.models.WalletTransactionHistoryModel;
import com.saas.payment.domain.wallet.ports.WalletRepositoryPort;
import com.saas.payment.domain.wallet.ports.WalletTransactionRepositoryPort;
import com.saas.payment.domain.wallet.ports.WalletTransactionRepositoryPort.SettlementData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Confirma um deposito a partir do webhook do gateway.
 *
 * <p>O gateway informa apenas o id da cobranca. O fluxo e:
 * <ol>
 *   <li>grava o log do webhook (auditoria, sempre);</li>
 *   <li>localiza a transacao PENDING pelo gatewayChargeId — e assim que
 *       descobrimos o {@code source} e os dados do deposito;</li>
 *   <li>se o status recebido nao for de pagamento confirmado, nao credita;</li>
 *   <li>idempotencia: se a transacao ja esta COMPLETED, nao credita de novo;</li>
 *   <li>numa transacao atomica: aplica o credito ao saldo da wallet e move a
 *       transacao de PENDING para COMPLETED.</li>
 * </ol>
 *
 * <p>Depende apenas de ports — nao conhece JPA nem o gateway concreto.
 */
public class ProcessDepositWebhookUseCase {

    private static final Logger log = LoggerFactory.getLogger(ProcessDepositWebhookUseCase.class);

    private final TransactionManagerPort transactionManager;
    private final WalletRepositoryPort walletRepository;
    private final WalletTransactionRepositoryPort transactionRepository;
    private final DepositWebhookLogRepositoryPort webhookLogRepository;
    private final String defaultCurrency;

    public ProcessDepositWebhookUseCase(TransactionManagerPort transactionManager,
                                        WalletRepositoryPort walletRepository,
                                        WalletTransactionRepositoryPort transactionRepository,
                                        DepositWebhookLogRepositoryPort webhookLogRepository,
                                        String defaultCurrency) {
        this.transactionManager = transactionManager;
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
        this.webhookLogRepository = webhookLogRepository;
        this.defaultCurrency = defaultCurrency;
    }

    public WalletTransactionHistoryModel execute(ProcessDepositWebhookCommand command) {
        log.info("[DepositWebhook] gatewayChargeId={} status={}",
                command.gatewayChargeId(), command.status() != null ? command.status() : "-");

        // 1. Localiza a transacao pendente pela cobranca. E daqui que sai o
        // `source` — o gateway nao o envia.
        WalletTransactionHistoryModel transaction =
                transactionRepository.findByGatewayChargeId(command.gatewayChargeId(), null);

        // 2. Log de auditoria, sempre gravado. Fica fora da transacao de saldo
        // para nao ser revertido junto. `source` vem da transacao (ou '-' se
        // nao encontrada, para um id desconhecido).
        DepositWebhookLogModel log0 = webhookLogRepository.create(
                new DepositWebhookLogModel(
                        transaction != null ? transaction.getSource() : "-",
                        command.rawPayload()),
                null);

        if (transaction == null) {
            log.warn("[DepositWebhook] Nenhuma transacao para gatewayChargeId={}", command.gatewayChargeId());
            throw new NotFoundException(
                    "No deposit found for gatewayChargeId=" + command.gatewayChargeId());
        }

        // 3. Se o gateway informou status e ele nao e de confirmacao, nao credita.
        if (command.status() != null && !PaidStatuses.isPaid(command.status())) {
            log.warn("[DepositWebhook] status nao confirmado ({}) para txId={}; ignorando credito",
                    command.status(), transaction.getId());
            webhookLogRepository.linkToTransaction(log0.getId(), transaction.getId(), null);
            return transaction;
        }

        // 4. Idempotencia: se ja foi creditado, nao credita de novo.
        if (transaction.getStatus() == TransactionStatusEnum.COMPLETED) {
            log.warn("[DepositWebhook] Evento duplicado ignorado txId={}", transaction.getId());
            webhookLogRepository.linkToTransaction(log0.getId(), transaction.getId(), null);
            return transaction;
        }

        // 5. Transacao atomica: credito no saldo e mudanca de status sobem juntos.
        WalletTransactionHistoryModel settled = transactionManager.runInTransaction(ctx -> {
            WalletModel wallet = walletRepository.getOrCreate(defaultCurrency, ctx);

            long previousBalance = wallet.getBalance();
            long newBalance = previousBalance + transaction.getAmount();

            WalletTransactionHistoryModel updated = transactionRepository.updateSettlement(
                    transaction.getId(),
                    new SettlementData(TransactionStatusEnum.COMPLETED, previousBalance, newBalance),
                    ctx);

            walletRepository.updateBalance(wallet.getWalletId(), newBalance, ctx);
            return updated;
        });

        // 6. Vincula o log a transacao (fora da transacao de saldo).
        webhookLogRepository.linkToTransaction(log0.getId(), settled.getId(), null);

        log.info("[DepositWebhook] settled source={} txId={} previous={} new={}",
                settled.getSource(), settled.getId(), settled.getPreviousBalance(), settled.getNewBalance());

        return settled;
    }
}
