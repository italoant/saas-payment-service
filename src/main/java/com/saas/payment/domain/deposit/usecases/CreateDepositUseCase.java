package com.saas.payment.domain.deposit.usecases;

import com.saas.payment.domain.deposit.ports.PaymentGatewayPort;
import com.saas.payment.domain.deposit.ports.PaymentGatewayPort.CreateGatewayChargeInput;
import com.saas.payment.domain.deposit.ports.PaymentGatewayPort.GatewayChargeResult;
import com.saas.payment.domain.shared.enums.TransactionStatusEnum;
import com.saas.payment.domain.shared.exceptions.BadRequestException;
import com.saas.payment.domain.shared.ports.TransactionManagerPort;
import com.saas.payment.domain.wallet.models.WalletModel;
import com.saas.payment.domain.wallet.models.WalletTransactionHistoryModel;
import com.saas.payment.domain.wallet.ports.WalletRepositoryPort;
import com.saas.payment.domain.wallet.ports.WalletTransactionRepositoryPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Orquestra a criacao de um deposito:
 *
 * <ol>
 *   <li>valida o valor;</li>
 *   <li>aplica idempotencia por (source, externalReference) — se ja existe um
 *       deposito para a referencia, nao cria outra cobranca;</li>
 *   <li>chama o gateway para gerar a cobranca (QR Code);</li>
 *   <li>registra a transacao como PENDING (o saldo NAO e creditado aqui — o
 *       credito acontece quando o gateway confirmar o pagamento via webhook);</li>
 *   <li>retorna a transacao e o QR Code.</li>
 * </ol>
 *
 * <p>Depende apenas de ports — nao conhece o gateway concreto nem o banco.
 */
public class CreateDepositUseCase {

    private static final Logger log = LoggerFactory.getLogger(CreateDepositUseCase.class);

    /**
     * Resultado da criacao de um deposito: a transacao registrada (ainda
     * PENDING) e os dados do QR Code que o cliente usa para pagar.
     */
    public record CreateDepositResult(WalletTransactionHistoryModel transaction, GatewayChargeResult charge) {
    }

    private final PaymentGatewayPort paymentGateway;
    private final TransactionManagerPort transactionManager;
    private final WalletRepositoryPort walletRepository;
    private final WalletTransactionRepositoryPort transactionRepository;
    private final String defaultCurrency;

    public CreateDepositUseCase(PaymentGatewayPort paymentGateway,
                                TransactionManagerPort transactionManager,
                                WalletRepositoryPort walletRepository,
                                WalletTransactionRepositoryPort transactionRepository,
                                String defaultCurrency) {
        this.paymentGateway = paymentGateway;
        this.transactionManager = transactionManager;
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
        this.defaultCurrency = defaultCurrency;
    }

    public CreateDepositResult execute(CreateDepositCommand command) {
        log.info("[CreateDeposit] source={} amount={} ref={}",
                command.source(), command.amount(),
                command.externalReference() != null ? command.externalReference() : "-");

        if (command.amount() <= 0) {
            throw new BadRequestException("amount must be a positive integer (cents)");
        }

        // 1. Idempotencia: se ja criamos um deposito para esta referencia,
        // chamar de novo nao deve gerar uma nova cobranca no gateway.
        if (command.externalReference() != null) {
            WalletTransactionHistoryModel existing = transactionRepository.findByExternalReference(
                    command.source(), command.externalReference(), null);
            if (existing != null) {
                throw new BadRequestException(
                        "A deposit already exists for source=" + command.source()
                                + " ref=" + command.externalReference());
            }
        }

        // 2. Gera a cobranca no gateway (QR Code). Fora da transacao de banco:
        // e uma chamada de rede a terceiro e nao deve segurar a transacao aberta.
        GatewayChargeResult charge = paymentGateway.createCharge(
                new CreateGatewayChargeInput(command.source(), command.amount(), command.externalReference()));

        // 3. Registra a transacao como PENDING. O saldo so e aplicado quando o
        // gateway confirmar o pagamento (webhook). O id da cobranca e guardado
        // em coluna dedicada — e por ele que o webhook vai conciliar.
        WalletTransactionHistoryModel transaction = transactionManager.runInTransaction(ctx -> {
            WalletModel wallet = walletRepository.getOrCreate(defaultCurrency, ctx);

            WalletTransactionHistoryModel model = new WalletTransactionHistoryModel();
            model.setWalletId(wallet.getWalletId());
            model.setSource(command.source());
            model.setAmount(command.amount());
            model.setPreviousBalance(wallet.getBalance());
            // Saldo ainda nao muda: deposito pendente de confirmacao.
            model.setNewBalance(wallet.getBalance());
            model.setExternalReference(command.externalReference());
            model.setGatewayChargeId(charge.gatewayChargeId());
            model.setStatus(TransactionStatusEnum.PENDING);
            return transactionRepository.create(model, ctx);
        });

        log.info("[CreateDeposit] pending txId={} gatewayChargeId={}",
                transaction.getId(), charge.gatewayChargeId());

        return new CreateDepositResult(transaction, charge);
    }
}
