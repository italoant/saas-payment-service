package com.saas.payment.domain.deposit.usecases;

import com.saas.payment.domain.deposit.ports.PaymentGatewayPort;
import com.saas.payment.domain.deposit.ports.PaymentGatewayPort.CreateGatewayChargeInput;
import com.saas.payment.domain.deposit.ports.PaymentGatewayPort.GatewayChargeResult;
import com.saas.payment.domain.shared.enums.TransactionStatusEnum;
import com.saas.payment.domain.shared.exceptions.BadRequestException;
import com.saas.payment.domain.shared.ports.TransactionManagerPort;
import com.saas.payment.domain.shared.ports.TransactionManagerPort.TransactionContext;
import com.saas.payment.domain.wallet.models.WalletModel;
import com.saas.payment.domain.wallet.models.WalletTransactionHistoryModel;
import com.saas.payment.domain.wallet.ports.WalletRepositoryPort;
import com.saas.payment.domain.wallet.ports.WalletTransactionRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Espelha create-deposit.use-case.spec.ts.
 */
class CreateDepositUseCaseTest {

    private PaymentGatewayPort paymentGateway;
    private TransactionManagerPort transactionManager;
    private WalletRepositoryPort walletRepository;
    private WalletTransactionRepositoryPort transactionRepository;
    private CreateDepositUseCase useCase;

    private final WalletModel wallet = new WalletModel(1L, 5000L, "BRL");

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        paymentGateway = mock(PaymentGatewayPort.class);
        transactionManager = mock(TransactionManagerPort.class);
        walletRepository = mock(WalletRepositoryPort.class);
        transactionRepository = mock(WalletTransactionRepositoryPort.class);

        when(paymentGateway.createCharge(any())).thenReturn(
                new GatewayChargeResult("stub_charge_1", "PIX-PAYLOAD", null,
                        Instant.parse("2030-01-01T00:00:00Z")));

        // Executa o callback passando um ctx fake, como o manager real faria.
        when(transactionManager.runInTransaction(any())).thenAnswer(inv -> {
            Function<TransactionContext, Object> work = inv.getArgument(0);
            return work.apply(null);
        });

        when(walletRepository.getOrCreate(any(), any())).thenReturn(wallet);
        when(transactionRepository.create(any(), any())).thenAnswer(inv -> {
            WalletTransactionHistoryModel m = inv.getArgument(0);
            m.setId(10L);
            return m;
        });
        when(transactionRepository.findByExternalReference(any(), any(), any())).thenReturn(null);
        when(transactionRepository.findByGatewayChargeId(any(), any())).thenReturn(null);

        useCase = new CreateDepositUseCase(paymentGateway, transactionManager, walletRepository,
                transactionRepository, "BRL");
    }

    @Test
    void criaCobrancaERegistraPendingSemCreditarSaldo() {
        CreateDepositUseCase.CreateDepositResult result = useCase.execute(
                new CreateDepositCommand("saas-a", 10050L, "tx_abc"));

        ArgumentCaptor<CreateGatewayChargeInput> chargeCaptor =
                ArgumentCaptor.forClass(CreateGatewayChargeInput.class);
        verify(paymentGateway).createCharge(chargeCaptor.capture());
        assertThat(chargeCaptor.getValue().source()).isEqualTo("saas-a");
        assertThat(chargeCaptor.getValue().amount()).isEqualTo(10050L);
        assertThat(chargeCaptor.getValue().externalReference()).isEqualTo("tx_abc");

        ArgumentCaptor<WalletTransactionHistoryModel> createCaptor =
                ArgumentCaptor.forClass(WalletTransactionHistoryModel.class);
        verify(transactionRepository).create(createCaptor.capture(), any());
        WalletTransactionHistoryModel created = createCaptor.getValue();
        assertThat(created.getStatus()).isEqualTo(TransactionStatusEnum.PENDING);
        assertThat(created.getPreviousBalance()).isEqualTo(5000L);
        assertThat(created.getNewBalance()).isEqualTo(5000L);
        assertThat(created.getGatewayChargeId()).isEqualTo("stub_charge_1");
        assertThat(created.getExternalReference()).isEqualTo("tx_abc");

        // O saldo da wallet NAO e atualizado na criacao do deposito.
        verify(walletRepository, never()).updateBalance(anyLong(), anyLong(), any());

        assertThat(result.transaction().getId()).isEqualTo(10L);
        assertThat(result.charge().qrCodePayload()).isEqualTo("PIX-PAYLOAD");
        assertThat(result.charge().gatewayChargeId()).isEqualTo("stub_charge_1");
    }

    @Test
    void rejeitaAmountNaoPositivo() {
        assertThatThrownBy(() -> useCase.execute(new CreateDepositCommand("saas-a", 0L, null)))
                .isInstanceOf(BadRequestException.class);
        verify(paymentGateway, never()).createCharge(any());
    }

    @Test
    void idempotenteRejeitaSeJaExisteDepositoParaReferencia() {
        WalletTransactionHistoryModel existing = new WalletTransactionHistoryModel();
        existing.setId(99L);
        when(transactionRepository.findByExternalReference(any(), any(), any())).thenReturn(existing);

        assertThatThrownBy(() -> useCase.execute(new CreateDepositCommand("saas-a", 100L, "dup")))
                .isInstanceOf(BadRequestException.class);

        verify(paymentGateway, never()).createCharge(any());
        verify(transactionRepository, never()).create(any(), any());
    }

    @Test
    void naoChecaIdempotenciaQuandoNaoHaExternalReference() {
        useCase.execute(new CreateDepositCommand("saas-a", 100L, null));
        verify(transactionRepository, never()).findByExternalReference(any(), any(), any());
        verify(paymentGateway).createCharge(any());
    }
}
