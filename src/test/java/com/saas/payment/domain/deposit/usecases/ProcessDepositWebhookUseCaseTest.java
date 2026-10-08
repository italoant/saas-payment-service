package com.saas.payment.domain.deposit.usecases;

import com.saas.payment.domain.deposit.models.DepositWebhookLogModel;
import com.saas.payment.domain.deposit.ports.DepositWebhookLogRepositoryPort;
import com.saas.payment.domain.shared.enums.TransactionStatusEnum;
import com.saas.payment.domain.shared.exceptions.NotFoundException;
import com.saas.payment.domain.shared.ports.TransactionManagerPort;
import com.saas.payment.domain.shared.ports.TransactionManagerPort.TransactionContext;
import com.saas.payment.domain.wallet.models.WalletModel;
import com.saas.payment.domain.wallet.models.WalletTransactionHistoryModel;
import com.saas.payment.domain.wallet.ports.WalletRepositoryPort;
import com.saas.payment.domain.wallet.ports.WalletTransactionRepositoryPort;
import com.saas.payment.domain.wallet.ports.WalletTransactionRepositoryPort.SettlementData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Map;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Espelha process-deposit-webhook.use-case.spec.ts.
 */
class ProcessDepositWebhookUseCaseTest {

    private TransactionManagerPort transactionManager;
    private WalletRepositoryPort walletRepository;
    private WalletTransactionRepositoryPort transactionRepository;
    private DepositWebhookLogRepositoryPort webhookLogRepository;
    private ProcessDepositWebhookUseCase useCase;

    private final WalletModel wallet = new WalletModel(1L, 5000L, "BRL");

    private WalletTransactionHistoryModel pendingTx() {
        WalletTransactionHistoryModel m = new WalletTransactionHistoryModel();
        m.setId(10L);
        m.setWalletId(1L);
        m.setSource("saas-a");
        m.setAmount(10050L);
        m.setPreviousBalance(5000L);
        m.setNewBalance(5000L);
        m.setGatewayChargeId("stub_charge_1");
        m.setStatus(TransactionStatusEnum.PENDING);
        return m;
    }

    @BeforeEach
    void setUp() {
        transactionManager = mock(TransactionManagerPort.class);
        walletRepository = mock(WalletRepositoryPort.class);
        transactionRepository = mock(WalletTransactionRepositoryPort.class);
        webhookLogRepository = mock(DepositWebhookLogRepositoryPort.class);

        when(transactionManager.runInTransaction(any())).thenAnswer(inv -> {
            Function<TransactionContext, Object> work = inv.getArgument(0);
            return work.apply(null);
        });
        when(walletRepository.getOrCreate(any(), any())).thenReturn(wallet);
        when(transactionRepository.findByGatewayChargeId(any(), any())).thenReturn(pendingTx());
        when(transactionRepository.updateSettlement(anyLong(), any(), any())).thenAnswer(inv -> {
            long id = inv.getArgument(0);
            SettlementData data = inv.getArgument(1);
            WalletTransactionHistoryModel m = pendingTx();
            m.setId(id);
            m.setStatus(data.status());
            m.setPreviousBalance(data.previousBalance());
            m.setNewBalance(data.newBalance());
            return m;
        });
        DepositWebhookLogModel log = new DepositWebhookLogModel();
        log.setId(1L);
        when(webhookLogRepository.create(any(), any())).thenReturn(log);

        useCase = new ProcessDepositWebhookUseCase(transactionManager, walletRepository,
                transactionRepository, webhookLogRepository, "BRL");
    }

    @Test
    void confirmaDepositoCreditaECompletaPendingParaCompleted() {
        WalletTransactionHistoryModel result = useCase.execute(
                new ProcessDepositWebhookCommand("stub_charge_1", "paid",
                        Map.of("id", "stub_charge_1", "status", "paid")));

        verify(walletRepository).updateBalance(eq(1L), eq(15050L), any());
        ArgumentCaptor<SettlementData> settleCaptor = ArgumentCaptor.forClass(SettlementData.class);
        verify(transactionRepository).updateSettlement(eq(10L), settleCaptor.capture(), any());
        assertThat(settleCaptor.getValue().status()).isEqualTo(TransactionStatusEnum.COMPLETED);
        assertThat(settleCaptor.getValue().previousBalance()).isEqualTo(5000L);
        assertThat(settleCaptor.getValue().newBalance()).isEqualTo(15050L);

        assertThat(result.getStatus()).isEqualTo(TransactionStatusEnum.COMPLETED);
        assertThat(result.getNewBalance()).isEqualTo(15050L);

        ArgumentCaptor<DepositWebhookLogModel> logCaptor =
                ArgumentCaptor.forClass(DepositWebhookLogModel.class);
        verify(webhookLogRepository).create(logCaptor.capture(), any());
        assertThat(logCaptor.getValue().getSource()).isEqualTo("saas-a");
        verify(webhookLogRepository).linkToTransaction(eq(1L), eq(10L), any());
    }

    @Test
    void assumeConfirmacaoQuandoStatusNaoInformado() {
        useCase.execute(new ProcessDepositWebhookCommand("stub_charge_1", null, Map.of()));
        verify(walletRepository).updateBalance(eq(1L), eq(15050L), any());
    }

    @Test
    void lanca404QuandoNaoHaTransacao() {
        when(transactionRepository.findByGatewayChargeId(any(), any())).thenReturn(null);

        assertThatThrownBy(() -> useCase.execute(
                new ProcessDepositWebhookCommand("desconhecido", null, Map.of())))
                .isInstanceOf(NotFoundException.class);

        ArgumentCaptor<DepositWebhookLogModel> logCaptor =
                ArgumentCaptor.forClass(DepositWebhookLogModel.class);
        verify(webhookLogRepository).create(logCaptor.capture(), any());
        assertThat(logCaptor.getValue().getSource()).isEqualTo("-");
        verify(walletRepository, never()).updateBalance(anyLong(), anyLong(), any());
    }

    @Test
    void naoCreditaQuandoStatusNaoConfirmado() {
        WalletTransactionHistoryModel result = useCase.execute(
                new ProcessDepositWebhookCommand("stub_charge_1", "failed", Map.of()));

        verify(walletRepository, never()).updateBalance(anyLong(), anyLong(), any());
        verify(transactionRepository, never()).updateSettlement(anyLong(), any(), any());
        assertThat(result.getStatus()).isEqualTo(TransactionStatusEnum.PENDING);
        verify(webhookLogRepository).linkToTransaction(eq(1L), eq(10L), any());
    }

    @Test
    void idempotenteNaoCreditaDeNovoSeJaCompleted() {
        WalletTransactionHistoryModel completed = pendingTx();
        completed.setStatus(TransactionStatusEnum.COMPLETED);
        when(transactionRepository.findByGatewayChargeId(any(), any())).thenReturn(completed);

        WalletTransactionHistoryModel result = useCase.execute(
                new ProcessDepositWebhookCommand("stub_charge_1", "paid", Map.of()));

        verify(walletRepository, never()).updateBalance(anyLong(), anyLong(), any());
        verify(transactionRepository, never()).updateSettlement(anyLong(), any(), any());
        assertThat(result.getStatus()).isEqualTo(TransactionStatusEnum.COMPLETED);
    }

    @Test
    void reconheceVariacoesDeStatusConfirmadoCaseInsensitive() {
        useCase.execute(new ProcessDepositWebhookCommand("stub_charge_1", "  APPROVED ", Map.of()));
        verify(walletRepository).updateBalance(eq(1L), eq(15050L), any());
    }
}
